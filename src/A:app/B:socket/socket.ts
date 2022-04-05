
/**
 * >> START OF SOCKET MEMORY (B LEVEL) <<
 */

import { cpus } from "os";
import { Worker as Thread, SHARE_ENV } from "worker_threads";
import { join } from "path";
import https from "https";
import http from "http";

import { PROJECT_CONFIG } from "../config/config.project";


namespace ThreadPool {
    const idleThreads: Thread[] = [];
    const pendingReqs: {
        eReq: http.IncomingMessage,
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
        thread.on("message", threadRes => {
            activeReqs.get(thread.threadId)
            .end(threadRes.message ? Buffer.from(threadRes.message, "utf-8") : http.STATUS_CODES[threadRes.status]);

            deactivateThread(thread);
        });
        
        // Thread error listener
        thread.on("error", err => {
            activeReqs.get(thread.threadId)
            .end(err);  // TODO: Error response?

            console.log(err);

            deactivateThread(thread);
        });
        
        // Erroneous thread close listener
        // Spawn new thread thread to replace despawned thread
        thread.on("exit", code => {
            if(code === 0) {
                return;
            }

            console.log(999);

            activeReqs.get(thread.threadId)
            .end(500);  // TODO: Error response?

            createThread();
        });

        deactivateThread(thread);
    }

    function deactivateThread(thread: Thread) {
        idleThreads.push(thread);

        activateThread(pendingReqs.shift());
    }

    export function activateThread(entity: {
        eReq: http.IncomingMessage,
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
            ip: getHeader(entity.eReq, "X-Forwarded-For") || entity.eReq.connection.remoteAddress,
            method: entity.eReq.method.toUpperCase(),
            url: entity.eReq.url
        } as ThreadReq);
    }
}


function getHeader(eReq: http.IncomingMessage, key: string) {
    return eReq.headers[key] || eReq.headers[key.toLowerCase()];
}


// Local HTTP instance (optional HTTPS and HTTP redirection in public proxy)
// TODO: HTTPS
http.createServer({
    maxHeaderSize: PROJECT_CONFIG.read("limit", "headerSize").number
}, (eReq: http.IncomingMessage, eRes: http.ServerResponse) => {
    // Request handler
    ThreadPool.activateThread({
        eReq, eRes
    });
})
.listen({
    backlog: PROJECT_CONFIG.read("limit", "requestsPending").number,
    port: PROJECT_CONFIG.read("port", "http").number,
    host: PROJECT_CONFIG.read("hostname").string,
});