const devConfig = {
    "appNameLong": "rapidJS"
};


process.argv[1] = process.argv.pop();


import { createServer as createServerHTTP, IncomingMessage, ServerResponse } from "http";
import { createServer as createServerHTTPS } from "https";
import { gzipSync, deflateSync, brotliCompressSync } from "zlib";

import { IRequest, IResponse, IHighlevelURL, IHighlevelLocale, IHighlevelCookieOut, THighlevelCookieIn } from "../interfaces";
import { MODE } from "../MODE";
import { APP_CONFIG } from "../config/APP_CONFIG";
import * as print from "../print";

import { RateLimiter } from "./RateLimiter";
import * as threadPool from "./thread-pool";


interface IAcceptHeaderPart {
    name: string;
    quality: number;
}


const rateLimiter: RateLimiter<string> = new RateLimiter(MODE.DEV ? Infinity : APP_CONFIG.limit.requestsPerClient);
const runsSecure = !!APP_CONFIG.tls;
const commonOptions = {
    server: {
        requestTimeout: APP_CONFIG.limit.timeout,
        headersTimeout: APP_CONFIG.limit.timeout,
        maxHeaderSize: APP_CONFIG.limit.headerSize,
        keepAlive: true // TODO: Optionalize?
    },
    listener: {
        host: APP_CONFIG.host // TODO: How to proxy?
    }
};


// TODO: Support HTTP/2
createServerHTTP({    
    ...commonOptions.server,

    ...(runsSecure ? {} : {}),  // TODO: TLS security
}, async (oReq: IncomingMessage, oRes: ServerResponse) => {
    const clientIP: string = oReq.headers["x-forwarded-for"]
    ? flattenHeader(oReq.headers["x-forwarded-for"]).split(/,/g).shift().trim()
    : oReq.socket.remoteAddress;
    
    if(!rateLimiter.grantsAccess(clientIP)) {
        return respond(oRes, 429);
    }
    if(oReq.url.length > APP_CONFIG.limit.urlLength) {
        return respond(oRes, 414);
    }
    
    const method: string = oReq.method.toUpperCase();

    ([ "POST", "PUT", "OPTIONS" ].includes(method)
    ? parseRequestBody(oReq)
    : new Promise(r => r(null)))
    .then(async (body: string) => {
        if(body?.length >= APP_CONFIG.limit.payloadSize) {
            return respond(oRes, 413);
        }

        const host: string = constructStrongHost(oReq.headers["host"]); // TODO: Compare with config (multiple, strict, ...?)
        const dynamicURL: URL = new URL(!/^https?:\/\//.test(oReq.url)
        ? `${host}${oReq.url}`
        : oReq.url);
        const highlevelURL: IHighlevelURL = {
            hash: dynamicURL.hash,
            host: dynamicURL.host,
            hostname: dynamicURL.hostname,
            href: dynamicURL.href,
            origin: dynamicURL.origin,
            password: dynamicURL.password,
            pathname: dynamicURL.pathname,
            port: dynamicURL.port,
            protocol: dynamicURL.protocol,
            search: dynamicURL.search,
            username: dynamicURL.username,

            searchParams: Object.fromEntries(dynamicURL.searchParams.entries())
        };

        const parseAcceptHeader = (name: string) => {
            return flattenHeader(oReq.headers[name] ?? "")
            .split(/,/g)
            .map((encoding: string) => encoding.trim())
            .filter((encoding: string) => encoding)
            .map((enconding: string) => {
                return {
                    name: enconding.match(/^[^;]+/)[0],
                    quality: parseFloat((enconding.match(/;q=([01](.[0-9]+)?)$/) || [ null, "1" ])[1])
                };
            })
            .sort((a, b) => (b.quality - a.quality)) as IAcceptHeaderPart[]
            ?? null;
        };

        const acceptedLocale: IAcceptHeaderPart[] = parseAcceptHeader("accept-language");
        const highlevelLocale: IHighlevelLocale[] = acceptedLocale
        .map((locale: IAcceptHeaderPart) => {
            const parts: string[] = locale.name.match(/^([a-z]+|\*)(-([A-Z]+))?$/);
            
            if(!parts) {
                return null;
            }
            
            return {
                language: parts[1],
                quality: locale.quality,

                ... parts[3]
                ? {
                    region: parts[3]
                }: {}
            };
        })
        .filter((locale: IHighlevelLocale) => locale);

        const highlevelCookies: THighlevelCookieIn = {};
        (oReq.headers["cookie"] ?? "")
        .split(/;/g)
        .forEach((cookie: string) => {
            if(!/\s*[^;, ]+=.+\s*/.test(cookie)) {
                return;
            }

            const parts: string[] = cookie.split(/=/);
            let value: string|number|boolean;
            try {
                value = JSON.parse(parts[1]);
            } catch {
                value = parts[1];
            }

            highlevelCookies[parts[0].trim()] = value;
        });

        const sReq: IRequest = {
            method: method,
            url: highlevelURL,
            cookies: highlevelCookies,
            locale: highlevelLocale,
            headers: oReq.headers,  // TODO: High-level headers interface?
            
            ... body ? { body } : {}
        };

        // TODO: So far, only successful requests; Add more events (rejected requests ... ?)
        process.send({
            signal: "reg:request",
            data: sReq
        });

        // Remove auto-processed headers from serialized high-level representation
        delete sReq.headers["host"];
        delete sReq.headers["accept-encoding"];
        delete sReq.headers["accept-language"];
        delete sReq.headers["cookie"];

        threadPool.register(sReq)
        .then((resParam: IResponse|number) => {
            if(typeof resParam === "number"
            || resParam.message instanceof Buffer) {
                return respond(oRes, resParam);
            }

            resParam.message = (typeof resParam.message !== "string")
            ? String(resParam.message)
            : resParam.message;

            let acceptedEncoding: string = parseAcceptHeader("accept-encoding")
            .shift()?.name
            .replace(/^\*$/, "gzip");
            switch(acceptedEncoding) {
                case "gzip":
                    resParam.message = gzipSync(resParam.message);
                    break;
                case "br":
                    resParam.message = brotliCompressSync(resParam.message);
                    break;
                case "deflate":
                    resParam.message = deflateSync(resParam.message);
                    break;
                default:
                    resParam.message = Buffer.from(resParam.message, "utf-8");

                    acceptedEncoding = null;
            }

            respond(oRes, resParam, {
                "Content-Encoding": acceptedEncoding
            });
        })
        .catch(err => {
            print.error(err);

            respond(oRes, 500);
        });
    })
    .catch(err => {
        print.error(err);

        respond(oRes, 422);
    });
})
.listen({
    ...commonOptions.listener,

    port: APP_CONFIG.port as number
});

// Redirect server
(runsSecure && APP_CONFIG.port === 443)
&& createServerHTTP(
    commonOptions.server
    , (oReq: IncomingMessage, oRes: ServerResponse) => {
    try {
        oRes.setHeader("Location", constructStrongHost(oReq.headers["host"]));

        respond(oRes, 308);
    } catch {
        respond(oRes, 500);
    }
})
.listen({
    ...commonOptions.listener,

    port: 80
}, () => print.info("Explicit HTTP to HTTPS redirection enabled"));


function constructStrongHost(weakHost: string): string {
    return weakHost
    .replace(/^(https?:\/\/)?/, `http${runsSecure ? "s" : ""}://`)
    .replace(/(:[0-9]+)?$/, `:${APP_CONFIG.port}`);
}

function flattenHeader(header: string|string[]): string {
    return [ header ].flat()[0];
}

function parseRequestBody(oReq: IncomingMessage): Promise<string> {
    const body: string[] = [];
    
    return new Promise((resolve, reject) => {
        oReq.on("data", (chunk: string) => {
            body.push(chunk);
        });

        oReq.on("end", () => {
            try {
                resolve(body.length ? body.join("") : null);
            } catch(err) {
                reject(err);
            }
        });

        oReq.on("error", err => {
            reject(err);
        });
    });
}

function respond(oRes: ServerResponse, resParam: IResponse|number, prioritizedHeaders?: Record<string, string|string[]>): void {
    if(oRes.writableEnded || oRes.writableFinished) {
        return;
    }
        
    resParam = (typeof resParam === "number")
    ? {
        status: resParam
    }
    : resParam;

    const contentLength: number = resParam.message
    ? ((resParam.message instanceof Buffer)
        ? Buffer.byteLength(resParam.message)
        : String(resParam.message).length)
    : 0;

    // TODO: Implement streams?

    // Default headers (overridable)
    oRes.setHeader("Server", devConfig.appNameLong);
    oRes.setHeader("X-XSS-Protection", "1; mode=block");
	oRes.setHeader("X-Powered-By", null);

    // Apply high level headers
    for(const name in resParam.headers) {
        oRes.setHeader(name, resParam.headers[name]);
    }
    
    // Default headers (prioritized)
    oRes.setHeader("Cache-Control", APP_CONFIG.cache.client ? `public, max-age=${APP_CONFIG.cache.client}, must-revalidate` : null);
	oRes.setHeader("Strict-Transport-Security", runsSecure ? `max-age=${APP_CONFIG.cache.client}; includeSubDomains` : null);
	oRes.setHeader("Content-Length", String(contentLength));
    oRes.hasHeader("Content-Type")
    && oRes.setHeader("X-Content-Type-Options", "nosniff");
    for(const name in prioritizedHeaders) {
        oRes.setHeader(name, prioritizedHeaders[name]);
    }
    
    // Set cookie header
    for(const name in resParam.cookies) {
        const cookie: IHighlevelCookieOut = resParam.cookies[name];
	    oRes.setHeader("Set-Cookie", `${name}=${cookie.value}${
            cookie.maxAge ? `; Max-Age: ${cookie.maxAge}`: ""
        }${
            cookie.domain ? `; Domain: ${cookie.domain}`: ""
        }${
            cookie.path ? `; Path: ${cookie.path}`: ""
        }${
            cookie.sameSite ? `; Same-Site: ${cookie.sameSite}`: ""
        }${
            cookie.httpOnly ? "; HttpOnly" : ""
        }${
            runsSecure ? "; Secure" : ""
        }`);
    }
    

    // TODO: Note that string messages are compressed
    oRes.statusCode = !APP_CONFIG.concealErrorStatus
    ? resParam.status : 400;

    // TODO: Respond rich
    oRes.end(resParam.message);

    resParam.message = `$[...] ${contentLength} bytes`;
    process.send({
        signal: "reg:response",
        data: resParam
    });

    // TODO: Cache?
}