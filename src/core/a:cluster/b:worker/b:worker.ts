/**
 * Module containing the workers web server construct implementing
 * initialization and listener behavior.
 * Enabled HTTPS will result in an additional HTTP server set up
 * providing respective HTTP to HTTPS redirection.
 */


import https from "https";
import http from "http";
import { existsSync, readFileSync } from "fs";

import { Config } from "../../config/Config";
import { print } from "../../print";
import { arrayify, projectNormalizePath } from "../../util";

import { IS_SECURE } from "../IS_SECURE";

import { IRequest } from "./interfaces";
import { EStatus } from "./EStatus";
import { HeadersMap } from"./HeadersMap";
import { RateLimiter } from "./RateLimiter";
import { hookResponseContext, respond, respondFromCache } from "./response";
import { activateThread } from "./thread-pool";


interface IBodyParseError {
	status: EStatus,
	
	err?: Error
}


// TODO: Watch memory usage for statically stored helper data (process.memoryUsage().heapUsed / 1024 / 1024); create helpoer class?

/* setTimeout(_ => {
	throw new Error("Eventual test error");
}, 3000); */


const rateLimiter: RateLimiter = new RateLimiter();

let boundHeadersFilter: string[] = [];


// Set generic server options
const serverOptions: TObject = {
	maxHeaderSize: Math.min(Config["project"].read("limit", "headerSize").number, 64000)	// Header size limit 64KB
};

// Set generic socket options
const socketOptions: TObject = {
	backlog: Config["project"].read("limit", "requestsPending").number,
	host: Config["project"].read("hostname").string
};


/**
 * Check whether a request accepts a certain response compression type.
 * Returns the checked compression type if is accepted.
 * @param {string} compressionHeader Accept-Encoding header value
 * @param {string} compressionType Compression type to check for acceptance
 * @returns 
 */
 function checkCompressionAccepted(compressionHeader: THeaderValue, compressionType: string): string {
	for(const header in arrayify(compressionHeader)) {
		if(header.match(new RegExp(`(^|,)[ ]*${compressionType}[ ]*($|,)`, "i"))) {
			return compressionType;
		}
	}

	return null;
}

/**
 * Read an SSL related file by type from configured location.
 * @param {string} type SSL file type {}
 * @returns 
 */
function readSSLFile(type: string) {
	let path: string = Config["project"].read("ssl", type).string;
	
	if(!path) {
		return null;
	}

	path = (path.charAt(0) != "/")
		? projectNormalizePath(path)
		: path;
	if(!existsSync(path)) {
		throw new ReferenceError(`SSL '${type}' file does not exist '${path}'`);
	}

	return path
		? readFileSync(path)
		: null;
};

/**
 * Parse request payload to body object.
 * @param {http.IncomingMessage} oReq Original request object
 * @returns {Promise<TObject>} Promise resolving to the parsed object (Rejecting with body parse error for reasoning)
 */
function parseRequestBody(oReq: http.IncomingMessage): Promise<TObject> {
	return new Promise((resolve: (_: TObject) => void, reject: (_: IBodyParseError) => void) => {
		const body: string[] = [];
		
		oReq.on("data", chunk => {
			body.push(chunk);

			if((body.length * 8) <= (Config["project"].read("limit", "payloadSize").number)) {
				return;
			}

			// Abort processing if body payload exceeds maximum size
			reject({
				status: EStatus.PAYLOAD_TOO_LARGE
			} as IBodyParseError);
		});

		oReq.on("end", () => {
			// Parse payload
			try {
				resolve((body.length > 0) ? JSON.parse(body.toString()) : null);
			} catch(err) {
				reject({
					status: EStatus.PRECONDITION_FAILED,

					err: err
				} as IBodyParseError);
			}
		});

		oReq.on("error", (err: Error) => {
			reject({
				status: EStatus.INTERNAL_ERROR,

				err: err
			} as IBodyParseError);
		});
	});
}


/*
 * Create and listen on the effective web server.
 * If an HTTPS port has been configured, the server will establish a secure socket.
 */
(IS_SECURE ? https : http)
	.createServer({
		...(IS_SECURE
		? {
			cert: readSSLFile("cert"),
			key: readSSLFile("key"),
			dhparam: readSSLFile("dhParam")
		}
		: {}),
		...serverOptions
	}, async (oReq: http.IncomingMessage, oRes: http.ServerResponse) => {
		const encode = checkCompressionAccepted(oReq.headers["accept-encoding"], "gzip")
					|| checkCompressionAccepted(oReq.headers["accept-encoding"], "deflate");
		const method: string = oReq.method.toUpperCase();
		
		// Construct thread request object related to the current response
		const url: URL = new URL(`http${IS_SECURE ? "s" : ""}://${oReq.headers["host"]}${oReq.url}`);
		
		const resId: number = hookResponseContext(oRes, url.pathname, encode, (method === "HEAD"));

		// Respond from cache if valid entry exists
		if(respondFromCache(url.pathname)) {
			return;
		}

		// TODO: General security interface?

		// URL length exceeded
		if(oReq.url.length > Config["project"].read("limit", "urlLength").number) {
			respond(EStatus.URL_EXCEEDED);

			return;
		}
		
		const ip: string = arrayify(oReq.headers["x-forwarded-for"])[0] || oReq.connection.remoteAddress;

		// Rate (request limit) exceeded
		if(rateLimiter.validateClient(ip)) {
			respond(EStatus.RATE_EXCEEDED);

			return;
		}
        
		// Hostname mismatch (only if configured)
		// TODO: Reconsider
		if(url.hostname !== (Config["project"].read("hostname").string || url.hostname)) {
			respond(EStatus.PRECONDITION_FAILED);

			return;
		}

		// Construct thread-filtered request object
		const headers: Record<string, THeaderValue> = {};
		boundHeadersFilter.forEach((name: string) => {
			headers[name] = oReq.headers[name];
		});

		const tReq: IRequest = {
			ip: ip,
			headers: new HeadersMap(headers),
			method: method,
			url: {
				hash: url.hash,
				hostname: url.hostname,
				pathname: url.pathname,
				searchParams: Object.fromEntries([...url.searchParams]),
				searchString: url.search
			}
		};

		// TODO: Emit connection event for individual request logs?
		
		if(!["POST", "PUT", "PATCH"].includes(method)) {
			activateThread(tReq, resId);

			return;
		}

		// Parse body first (async) if is payload associated request
		parseRequestBody(oReq)
		.then((body: TObject) => {
			tReq.body = body;

			activateThread(tReq, resId);
		})
		.catch((bodyParseError: IBodyParseError) => {
			respond(bodyParseError.status);
			
			bodyParseError.err && print.error(bodyParseError.err);
		});
	})
	.listen({
		...socketOptions,

		port: Config["project"].read("port", `http${IS_SECURE ? "s" : ""}`).number
	});

/*
 * Create and listen on the HTTP to HTTPS redirection web server.
 * Only established if both HTTP and HTTPS ports have been configured.
 * TODO: Necessary?
 */
IS_SECURE
&& http.createServer(serverOptions, (oReq: http.IncomingMessage, oRes: http.ServerResponse) => {
	oRes.statusCode = EStatus.REDIRECT;
	// TODO: Use generic response routine
	const securePort: number = Config["project"].read("port", "https").number;
	const secureHost: string = oReq.headers["host"].replace(/(:[0-9]+)?$/i, (securePort !== 443) ? `:${securePort}` : "");
	oRes.setHeader("Location", `https://${secureHost}${oReq.url}`);
	
	oRes.end();
})
.listen({
	...socketOptions,

	port: Config["project"].read("port", "http").number
});


/**
 * Bind headers filter name sequence for future thread request object construction.
 * @param {string[]} headersFilter Header names to provide to thread request object
 */
export function bindHeadersFilter(headersFilter: string[]) {
	boundHeadersFilter = headersFilter.map((name: string) => name.toLowerCase());
}