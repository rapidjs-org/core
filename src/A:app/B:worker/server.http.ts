
/**
 * >> START OF SOCKET MEMORY (B LEVEL) <<
 */

import config from "../app.config.json";

import { existsSync, readFileSync } from "fs";
import https from "https";
import http from "http";

import { print } from "../../print";

import { PROJECT_CONFIG } from "../config/config.PROJECT";
import { IS_SECURE } from "../IS_SECURE";
import { normalizePath } from "../util";

import { EStatus } from "./EStatus";
import { HeadersMap } from"./HeadersMap";
import { RateLimiter } from "./RateLimiter";
import { respond, redirect } from "./response";
import { IThreadReq } from "./interfaces.B";
import * as ThreadPool from "./thread-pool";

// TODO: Watch memory usage for statically stored helper data (process.memoryUsage().heapUsed / 1024 / 1024); create helpoer class?

// TODO: Error messaqge formatting (globally)?
// TODO: In all memory spaces?
/* process.on("uncaughtException", err => {
    print.error(err.message);
}); */

/* setTimeout(_ => {
	throw new Error("Eventual test error");
}, 3000); */

const configuredHostname: string = PROJECT_CONFIG.read("hostname").string;

const rateLimiter: RateLimiter = new RateLimiter();


// Set SSL options if is secure environment
const readSSLFile = (type: string) => {
	let path: string = PROJECT_CONFIG.read("ssl", type).string;
	
	if(!path) {
		return null;
	}

	path = (path.charAt(0) != "/")
		? normalizePath(path)
		: path;
	if(!existsSync(path)) {
		throw new ReferenceError(`SSL '${type}' file does not exist '${path}'`);
	}

	return path
		? readFileSync(path)
		: null;
};
const sslOptions: {
    cert?: Buffer,
    key?: Buffer,
    dhparam?: Buffer
} = IS_SECURE
	? {
		cert: readSSLFile("cert"),
		key: readSSLFile("key"),
		dhparam: readSSLFile("dhParam")
	}
	: {};

// Set generic server options
const serverOptions: TObject = {
	maxHeaderSize: Math.min(PROJECT_CONFIG.read("limit", "headerSize").number, 64000)	// Header size limit 64KB
};

// Set generic socket options
const socketOptions: TObject = {
	backlog: PROJECT_CONFIG.read("limit", "requestsPending").number,
	host: PROJECT_CONFIG.read("hostname").string,
};


// HELPERS

interface IBodyParseError {
	status: EStatus,
	
	err?: Error
}

function parseRequestBody(eReq: http.IncomingMessage): Promise<TObject> {
	return new Promise((resolve: (_: TObject) => void, reject: (_: IBodyParseError) => void) => {
		const body: string[] = [];
		
		eReq.on("data", chunk => {
			body.push(chunk);

			if((body.length * 8) > (PROJECT_CONFIG.read("limit", "payloadSize").number)) {
				// Abort processing if body payload exceeds maximum size
				reject({
					status: EStatus.PAYLOAD_TOO_LARGE
				});
			}
		});

		eReq.on("end", () => {
			// Parse payload
			try {
				resolve((body.length > 0) ? JSON.parse(body.toString()) : null);
			} catch(err) {
				reject({
					status: EStatus.PRECONDITION_FAILED,

					err: err
				});
			}
		});

		eReq.on("error", (err: Error) => {
			reject({
				status: EStatus.INTERNAL_ERROR,

				err: err
			});
		});
	});
}

function retrieveAmbivalentHeaderValue(value: string[]|string): string {	// TODO: Check
	return Array.isArray(value) ? value[0] : value;
}


/*
 * ESSENTIAL APP SERVER SOCKET.
 */
(IS_SECURE ? https : http)
	.createServer({
		...sslOptions,
		...serverOptions
	}, (eReq: http.IncomingMessage, eRes: http.ServerResponse) => {
		const method: string = eReq.method.toUpperCase();

		// Unsupported request method
		if(!["GET", "HEAD", "POST"].includes(method)) {
			respond(eRes, EStatus.UNSUPPORTED_METHOD);

			return;
		}

		// URL length exceeded
		if(eReq.url.length > (PROJECT_CONFIG.read("limit", "urlLength")).number) {
			respond(eRes, EStatus.URL_EXCEEDED);

			return;
		}

		const clientIp: string = retrieveAmbivalentHeaderValue(eReq.headers["x-forwarded-for"]) || eReq.connection.remoteAddress;

		// Rate (request limit) exceeded
		if(rateLimiter.exceeded(clientIp)) {
			respond(eRes, EStatus.RATE_EXCEEDED);

			return;
		}
        
		// Construct thread request object related to the current response
		const url: URL = new URL(`http${IS_SECURE ? "s" : ""}://${eReq.headers["host"]}${eReq.url}`);

		// Hostname mismatch (only if configured)
		// TODO: Reconsider
		if(configuredHostname
		&& configuredHostname !== url.hostname) {
			respond(eRes, EStatus.UNSUPPORTED_METHOD);

			return;
		}
		
		// Permanently redirect dynamic extension (and possibly index name) explicit dynamic file requests to implicit variant
		const invalidPathnameSuffixRegex = new RegExp(`((/)${config.indexPageName}|((/)${config.indexPageName})?\\.${config.dynamicFileExtension})$`);
		if(invalidPathnameSuffixRegex.test(url.pathname)) {
			url.pathname = url.pathname.replace(invalidPathnameSuffixRegex, "$2$4");
			
			redirect(eRes, url.toString());
			
			return;
			// TODO: Allowed subdomains?
			// TODO: Force www strategy option
		}

		const tReq: IThreadReq = {
			ip: clientIp,
			method: method,
			hash: url.hash,
			hostname: url.hostname,
			pathname: url.pathname,
			searchParams: url.searchParams,

			// Extract headers relevant for handler routine
			headers: new HeadersMap({
				"Accept-Encoding": retrieveAmbivalentHeaderValue(eReq.headers["accept-encoding"]),
				"Authorization": eReq.headers["authorization"],
				"Cookie": eReq.headers["cookie"],
				"If-None-Match": eReq.headers["if-none-match"]
			})
		};

		// TODO: Emit connection event for individual request logs
		
		// Request handler
		const threadInfo = {
			eRes,
			tReq
		};

		// Parse body first (async) if is plug-in (POST) request
		if(tReq.method === "POST") {
			parseRequestBody(eReq)
				.then((body: TObject) => {
					if(!(body || {}).pluginName) {
						respond(eRes, EStatus.PRECONDITION_FAILED);

						return;
					}

					threadInfo.tReq.body = body;

					ThreadPool.activateThread(threadInfo);
				})
				.catch((bodyParseError: IBodyParseError) => {
					respond(eRes, bodyParseError.status);
					
					bodyParseError.err && print.error(bodyParseError.err);
				});
			
			return;
		}
		
		ThreadPool.activateThread(threadInfo);
	})
	.listen({
		...socketOptions,

		port: PROJECT_CONFIG.read("port", `http${IS_SECURE ? "s" : ""}`).number
	});


/*
 * REDIRECTION SERVER (HTTP -> HTTPS).
 * Only activates in secure mode (https configured).
 */
// TODO: Necessary?
IS_SECURE && http
	.createServer(serverOptions, (eReq: http.IncomingMessage, eRes: http.ServerResponse) => {
		eRes.statusCode = EStatus.REDIRECT;
		// TODO: Use generic response routine
		const securePort: number = PROJECT_CONFIG.read("port", "https").number;
		const secureHost: string = eReq.headers["host"].replace(/(:[0-9]+)?$/i, (securePort !== 443) ? `:${securePort}` : "");
		eRes.setHeader("Location", `https://${secureHost}${eReq.url}`);
		
		eRes.end();

		// TODO: Handle dynamic file extension redirect here to eliminate possible additional redirect
	})
	.listen({
		...socketOptions,

		port: PROJECT_CONFIG.read("port", "http").number
	});