
/**
 * >> START OF SOCKET MEMORY (B LEVEL) <<
 */

import { readFileSync } from "fs";
import { cpus } from "os";
import { Worker as Thread, SHARE_ENV } from "worker_threads";
import { join } from "path";
import https from "https";
import http from "http";

import { PROJECT_CONFIG } from "../config/config.project";

import { normalizePath } from "../../util";

import { Status } from "./Status";
import { rateExceeded } from "./rate-limiter";


const isSecure: boolean = !!PROJECT_CONFIG.read("port", "https").string;

// Set SSL options if is secure environment
const readSSLFile = (path: string) => {
    // TODO: File exists check?
    return path
    ? readFileSync(normalizePath(path))
    : null;
};
const sslOptions: {
    cert?: Buffer,
    key?: Buffer,
    dhparam?: Buffer
} = isSecure
? {
    cert: readSSLFile(PROJECT_CONFIG.read("ssl", "cert").string),
	key: readSSLFile(PROJECT_CONFIG.read("ssl", "key").string),
	dhparam: readSSLFile(PROJECT_CONFIG.read("ssl", "dhParam").string)
}
: {};
// Set generic server options
const serverOptions: Record<string, any> = {
    maxHeaderSize: PROJECT_CONFIG.read("limit", "headerSize").number
}
// Set generic socket options
const socketOptions: Record<string, any> = {
    backlog: PROJECT_CONFIG.read("limit", "requestsPending").number,
    host: PROJECT_CONFIG.read("hostname").string,
}


namespace ThreadPool {
    const idleThreads: Thread[] = [];
    const pendingReqs: {
        tReq: ThreadReq,
        eRes: http.ServerResponse
    }[] = [];
    const activeReqs: Map<number, http.ServerResponse> = new Map();

    // Initially create fixed amount of reusable threads
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
                status: Status.INTERNAL
            } as ThreadRes);  // TODO: Error response?

            console.log(err);

            deactivateThread(thread);
        });
        
        // Erroneous thread close listener
        // Spawn new thread thread to replace despawned thread
        thread.on("exit", code => {
            if(code === 0) {
                return;
            }
            
            respondIndividually(activeReqs.get(thread.threadId), {
                status: Status.INTERNAL
            } as ThreadRes);  // TODO: Error response?  // TODO: Error response?

            createThread();
        });

        deactivateThread(thread);
    }

    function deactivateThread(thread: Thread) {
        idleThreads.push(thread);

        activateThread(pendingReqs.shift());
    }

    export function activateThread(entity: {
        tReq: ThreadReq,
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
        thread.postMessage(entity.tReq);
    }
}


function respondGenerically(eRes: http.ServerResponse, status: number) {
    respondIndividually(eRes, {
        status: status
    } as ThreadRes);
}

function respondIndividually(eRes: http.ServerResponse, tRes: ThreadRes) {
    if(!eRes) {
        return;
    }

    eRes.statusCode = tRes.status || Status.SUCCESS;

    eRes.end(tRes.message ? Buffer.from(tRes.message, "utf-8") : http.STATUS_CODES[tRes.status])
}


/*
 * ESSENTIAL APP SERVER SOCKET.
 */
(isSecure ? https : http)
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
    const url: URL = new URL(`http${isSecure ? "s" : ""}://${eReq.headers["host"]}${eReq.url}`);
    const tReq: ThreadReq = {
        ip: String(eReq.headers["x-forwarded-for"]) || eReq.connection.remoteAddress,
        method: eReq.method.toUpperCase(),
        hostname: url.hostname,
        pathname: url.pathname,
        searchParams: url.searchParams
    };

    // Check: Rate (request limit) exceeded
    if(rateExceeded(tReq.ip)) {
        return respondGenerically(eRes, Status.RATE_EXCEEDED);
    }
    
    // Request handler
    ThreadPool.activateThread({
        tReq, eRes
    });
})
.listen({
    ...socketOptions,

    port: PROJECT_CONFIG.read("port", `http${isSecure ? "s" : ""}`).number
});

/*
 * REDIRECTION SERVER (HTTP -> HTTPS).
 * Only activates in secure mode (https configured).
 */
isSecure && http
.createServer(serverOptions, (eReq: http.IncomingMessage, eRes: http.ServerResponse) => {
	// TODO: Redirect
})
.listen({
    ...socketOptions,

    port: PROJECT_CONFIG.read("port", "http").number || 80
});