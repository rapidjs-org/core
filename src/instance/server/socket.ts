
import { cpus } from "os";
import { Worker as Thread, SHARE_ENV } from "worker_threads";
import { join } from "path";
import http from "http";

import { print } from "../../print";

import { PROJECT_CONFIG } from "../config/config.project";


namespace ThreadPool {
    const idleThreads: Thread[] = [];
    const pendingReqs: ThreadReq[] = [];
    const activeReqs: Map<number, {
        resolve: (data: ThreadReq) => void,
        reject: (data: Error) => void
    }> = new Map();

    // Initially create fixed amount of reusable threads
    Array.from({ length: --cpus().length }, add);

    function add() {
        const thread = new Thread(join(__dirname, "./thread.js"), {
            env: SHARE_ENV,
            argv: process.argv.slice(2),
            
        });
        
        // Success (message provision) listener
        thread.on("message", threadRes => {
            activeReqs.get(thread.threadId)
            .resolve(threadRes);
        });
        
        // Thread error listener
        thread.on("error", err => {
            activeReqs.get(thread.threadId)
            .reject(err);   // TODO: Fix

            idleThreads.push(thread);

            use(pendingReqs.pop());
        });
        
        // Erroneous thread close listener
        // Spawn new thread thread to replace despawned thread
        thread.on("exit", code => {
            if(code === 0) {
                return;
            }

            add();

            use(pendingReqs.pop());
            
            activeReqs.get(thread.threadId)
            .reject(new Error(`Error in thread thread ... restart`));
        });

        idleThreads.push(thread);
    }

    export function use(req: ThreadReq) {
        if(req === undefined) {
            return;
        }

        if(idleThreads.length === 0) {
            pendingReqs.push(req);

            return;
        }

        const thread = idleThreads.pop();

        return new Promise((resolve, reject) => {
            activeReqs.set(thread.threadId, {
                resolve,
                reject
            });

            thread.postMessage(req);
        });
    }
}


// Local HTTP instance (optional HTTPS and HTTP redirection in public proxy)
http.createServer({}, (req, res) => {
    // Filter HTTP request object for thread reduced request object
    const threadReq: ThreadReq = {
        method: req.url,
        url: req.url
    };
    
    // Request handler
    ThreadPool.use(threadReq)
    .then((threadRes: ThreadRes) => {
        res.end(Buffer.from(threadRes.message, "utf-8"));
    })
    .catch(err => {
        print.error(err);
    });
})
.listen(PROJECT_CONFIG.read("port", "http").number);