
/**
 * >> START OF SOCKET MEMORY (B LEVEL) <<
 */

import { existsSync, readFileSync } from "fs";
import { cpus } from "os";
import { Worker as Thread, SHARE_ENV, BroadcastChannel } from "worker_threads";
import { join } from "path";
import https from "https";
import http from "http";

import config from "../app.config.json";

import { print } from "../../print";
import { normalizePath, mergeObj } from "../../util";

import { PROJECT_CONFIG } from "../config/config.project";
import { IS_SECURE } from "../secure";
import { IPCSignal } from "../IPCSignal";

import { Status } from "./Status";
import { rateExceeded } from "./rate-limiter";


// Error messaqge formatting (globally)
// TODO: In all memory spaces?
/* process.on("uncaughtException", err => {
    print.error(err.message);
}); */

class HeadersMap extends Map<string, string|number|boolean> {

    constructor(dictionaryRec?: Record<string, string|number|boolean>) {
        super(Object.entries(dictionaryRec || {}));
    }

    public get(name: string) {
        return super.get(name.toLowerCase());
    }

    public set(name: string, value: string|number|boolean) {
        super.set(name.toLowerCase(), value);

        return null;
    }

}


namespace ThreadPool {
    const idleThreads: Thread[] = [];
    const activeReqs: Map<number, http.ServerResponse> = new Map();
    const pendingReqs: {
        tReq: IThreadReq,
        tRes: IThreadRes,
        eRes: http.ServerResponse
    }[] = [];
    const broadcastChannel: BroadcastChannel = new BroadcastChannel(config.threadsBroadcastChannelName);

    // Create fixed amount of new, reusable threads
    // TODO: Use config file parameter for size?
    Array.from({ length: --cpus().length }, createThread);

    function createThread() {
        const thread = new Thread(join(__dirname, "./C:thread/thread.js"), {
            env: SHARE_ENV,
            argv: process.argv.slice(2)
        });

        // Success (message provision) listener
        thread.on("message", tRes => {
            respondIndividually(activeReqs.get(thread.threadId), tRes);

            deactivateThread(thread);
        });
        
        // Thread error listener
        thread.on("error", err => {
            respondIndividually(activeReqs.get(thread.threadId), {
                status: Status.INTERNAL_ERROR
            } as IThreadRes);  // TODO: Error response?

            deactivateThread(thread);

            // TODO: Error restart limit?

            print.error(err.message);
            console.log(err.stack);
        });
        
        // Erroneous thread close listener
        // Spawn new thread thread to replace despawned thread
        thread.on("exit", code => {
            if(code === 0) {
                return;
            }
            
            respondIndividually(activeReqs.get(thread.threadId), {
                status: Status.INTERNAL_ERROR
            } as IThreadRes);  // TODO: Error response?  // TODO: Error response?

            createThread();
        });

        deactivateThread(thread);
    }

    function deactivateThread(thread: Thread) {
        idleThreads.push(thread);

        activateThread(pendingReqs.shift());
    }

    export function activateThread(entity: {
        tReq: IThreadReq,
        tRes: IThreadRes,
        eRes: http.ServerResponse
    }) {
        if(entity === undefined
        || idleThreads.length === 0) {
            pendingReqs.push(entity);
            
            return;
        }

        const thread = idleThreads.shift()  // FIFO

        activeReqs.set(thread.threadId, entity.eRes);

        // Filter HTTP request object for thread reduced request object
        thread.postMessage({
            tReq: entity.tReq,
            tRes: entity.tRes
        });
    }

    export function broadcast(message: Record<string, any>) {
        broadcastChannel.postMessage(message);
    }

}


function respondGenerically(eRes: http.ServerResponse, status: number) {
    respondIndividually(eRes, {
        status: status,
        headers: new HeadersMap()
    } as IThreadRes);
}

function respondIndividually(eRes: http.ServerResponse, tRes: IThreadRes) {
    if(!eRes) {
        return;
    }

    const messageBuffer: Buffer = Buffer.from(tRes.message ? tRes.message : http.STATUS_CODES[tRes.status], "utf-8");

    // Common headers
    tRes.headers.set("X-XSS-Protection", "1; mode=block");
    tRes.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
    tRes.headers.set("Content-Length", Buffer.byteLength(messageBuffer, "utf-8"));
    tRes.headers.set("Strict-Transport-Security", IS_SECURE ? `max-age=${PROJECT_CONFIG.read("cachingDuration", "client")}; includeSubDomains` : null);
    tRes.headers.set("Cache-Control", PROJECT_CONFIG.read("cache", "client").object ? `public, max-age=${PROJECT_CONFIG.read("cache", "client").number}, must-revalidate` : null);

    // Additional headers set from handler
    tRes.headers
    .forEach((value: string, header: string) => {
        if(value === undefined || value === null) {
            return;
        }

        eRes.setHeader(header, value);
    });

    eRes.statusCode = tRes.status || Status.SUCCESS;    // TODO: Concealing error status

    eRes.end(messageBuffer);
}


// Set SSL options if is secure environment
const readSSLFile = (type: string) => {
    let path: string = PROJECT_CONFIG.read("ssl", type).string;
    if(!path) {
        return null;
    }

    path = normalizePath(path);
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
const serverOptions: Record<string, any> = {
    maxHeaderSize: PROJECT_CONFIG.read("limit", "headerSize").number
};

// Set generic socket options
const socketOptions: Record<string, any> = {
    backlog: PROJECT_CONFIG.read("limit", "requestsPending").number,
    host: PROJECT_CONFIG.read("hostname").string,
};

/*
 * ESSENTIAL APP SERVER SOCKET.
 */
(IS_SECURE ? https : http)
.createServer({
    ...sslOptions,
    ...serverOptions
}, (eReq: http.IncomingMessage, eRes: http.ServerResponse) => {
    // Check: Unsupported request method
    if(!["GET", "HEAD", "POST"].includes(eReq.method)) {
        return respondGenerically(eRes, Status.UNSUPPORTED_METHOD);
    }

    // Check: URL length exceeded
    if(eReq.url.length > (PROJECT_CONFIG.read("limit", "urlLength") || Infinity)) {
        return respondGenerically(eRes, Status.URL_EXCEEDED);
    }
        
    // Construct thread request object related to the current response
    const url: URL = new URL(`http${IS_SECURE ? "s" : ""}://${eReq.headers["host"]}${eReq.url}`);
    const tReq: IThreadReq = {
        ip: String(eReq.headers["x-forwarded-for"]) || eReq.connection.remoteAddress,
        method: eReq.method.toUpperCase(),
        hostname: url.hostname,
        pathname: url.pathname,
        searchParams: url.searchParams,
        // Extract headers relevant for handler routine
        headers: new HeadersMap({
            "If-None-Match": eReq.headers["if-none-match"]
        })
    };
    const tRes: IThreadRes = {
        // Already set static headers with custom overrides
        // Relevant headers to have overriding access throughout handler routine
        headers: new HeadersMap(mergeObj({
            "Server": "rapidJS"
        }, (PROJECT_CONFIG.read("customHeaders").object || {})))
    };

    // TODO: Emit connection event for individual request logs

    // Check: Rate (request limit) exceeded
    if(rateExceeded(tReq.ip)) {
        return respondGenerically(eRes, Status.RATE_EXCEEDED);
    }
    
    // Request handler
    ThreadPool.activateThread({
        tReq, tRes,
        eRes
    });
})
.listen({
    ...socketOptions,

    port: PROJECT_CONFIG.read("port", `http${IS_SECURE ? "s" : ""}`).number
});


/*
 * REDIRECTION SERVER (HTTP -> HTTPS).
 * Only activates in secure mode (https configured).
 */
IS_SECURE && http
.createServer(serverOptions, (eReq: http.IncomingMessage, eRes: http.ServerResponse) => {
    eRes.statusCode = Status.REDIRECT;
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


/*
 * IPC interface (top-down).
 */

const passivePluginRegistry: IPassivePlugin[] = [];

export function message(message: Record<string, any>) {
    // TODO: IPC types
    switch(message.type) {
        case IPCSignal.PLUGIN:
            ThreadPool.broadcast(message.data);

            passivePluginRegistry.push(message.data);
            
            break;
    }
}

process.on("message", message);