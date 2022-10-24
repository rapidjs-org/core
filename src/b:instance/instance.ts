import { createServer as createServerHTTP, IncomingMessage, ServerResponse } from "http";
import { createServer as createServerHTTPS } from "https";
import { gzipSync, deflateSync, brotliCompressSync } from "zlib";

import { EVENT_EMITTER } from "../EVENT_EMITTER";
import { APP_CONFIG } from "../config/APP_CONFIG";
import * as print from "../print";

import { IRequest, IResponse, ISerializedURL } from "./interfaces";
import { RateLimiter } from "./RateLimiter";
import * as threadPool from "./thread-pool";


const rateLimiter: RateLimiter<string> = new RateLimiter(APP_CONFIG.limit.requestsPerClient);
const runsSecure = !!APP_CONFIG.tls;
const commonOptions = {
    server: {},
    socket: {}
};


// TODO: Support HTTP/2
createServerHTTP({
    ...(runsSecure ? {} : {}),  // TODO: ...
    ...commonOptions.server
}, (oReq: IncomingMessage, oRes: ServerResponse) => {
    const clientIP: string = oReq.headers["x-forwarded-for"]
    ? flattenHeader(oReq.headers["x-forwarded-for"]).split(/,/g).shift().trim()
    : oReq.socket.remoteAddress;
    
    // Guards
    if(!rateLimiter.grantsAccess(clientIP)) {
        return respond(oRes, 429);
    }
    if(!rateLimiter.grantsAccess(clientIP)) {
        return respond(oRes, 429);
    }

    // TODO: Limits (Request Header Fields Too Large!)

    const host: string = `http${runsSecure ? "s" : ""}://${oReq.headers.host}:${APP_CONFIG.port}`; // TODO: Compare with config (multiple, strict, ...?)
    const dynamicURL: URL = new URL(`${host}${oReq.url}`);
    const serializedURL: ISerializedURL = {
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

    ([ "POST", "PUT", "OPTIONS" ].includes(oReq.method.toUpperCase())
    ? parseRequestBody(oReq)
    : new Promise(r => r(null)))
    .then(async body => {
        const sReq: IRequest = {
            url: serializedURL,
            headers: oReq.headers,
            body: body
        };

        threadPool.register(sReq)
        .then((resParam: IResponse|number) => {
            console.log(resParam)
            if(typeof resParam === "number"
            || resParam.message instanceof Buffer) {
                return respond(oRes, resParam);
            }

            resParam.message = (typeof resParam.message !== "string")
            ? String(resParam.message)
            : resParam.message;

            let acceptedEncoding: string = flattenHeader(oReq.headers["accept-encoding"] ?? "")
            .split(/,/g)
            .map((encoding: string) => encoding.trim())
            .filter((encoding: string) => encoding)
            .map((enconding: string) => {
                return {
                    name: enconding.match(/^[^;]+/)[0],
                    quality: parseFloat((enconding.match(/;q=([01](.[0-9]+)?)$/) || [ null, "1" ])[1])
                };
            })
            .sort((a, b) => (b.quality - a.quality))
            .shift()?.name;  // TODO: Apply for locale as well

            acceptedEncoding = (acceptedEncoding === "*") ? "gzip" : acceptedEncoding;
            
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
            
            acceptedEncoding
            && oRes.setHeader("Content-Encoding", acceptedEncoding);

            oRes.setHeader("Content-Length", Buffer.byteLength(resParam.message));
            
            respond(oRes, resParam);
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
    ...commonOptions.socket,

    port: APP_CONFIG.port
}, () => {
    EVENT_EMITTER.emit("listening");   // TODO: To cluster module (mem space A)
});

// TODO: Redirect server?


function flattenHeader(header: string|string[]): string {
    return [ header ].flat()[0];
}

function parseRequestBody(oReq: IncomingMessage): Promise<unknown> {
    const body: string[] = [];
    
    return new Promise((resolve, reject) => {
        oReq.on("data", (chunk: string) => {
            body.push(chunk);
        });

        oReq.on("end", () => {
            try {
                resolve(body.length ? JSON.parse(body.join("")) : null);
            } catch(err) {
                reject(err);
            }
        });

        oReq.on("error", err => {
            reject(err);
        });
    });
}

function respond(oRes: ServerResponse, resParam: IResponse|number): void {
    if(oRes.writableEnded || oRes.writableFinished) {
        return;
    }

    resParam = (typeof resParam === "number")
    ? {
        status: resParam
    }
    : resParam;

    // TODO: Implement streams?

    // TODO: Note that string messages are compressed
    oRes.statusCode = resParam.status;    // TODO: Concealing error status/message

    // TODO: Respond rich
    oRes.end(resParam.message);

    // TODO: Cache?
}