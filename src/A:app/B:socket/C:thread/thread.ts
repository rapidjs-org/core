/**
 * >> START OF INDEPENDANT MEMORY (C LEVEL) <<
 */

import { parentPort } from "worker_threads";

import { PROJECT_CONFIG } from "../../config/config.project";

import handleAsset from "./handler/handler.asset";
import handlePlugin from "./handler/handler.plugin";
import { Status } from "./Status";
import { rateExceeded } from "./rate-limiter";


/**
 * Respond from thread (message socket with individual data relevant for network response).
 * @param {ThreadRes} tRes Thread response object
 * @param {boolean} headerOnly Whether to only send headers
 */
function respond(tRes: ThreadRes, headerOnly: boolean = false) {
    // Generic headers
    
    parentPort.postMessage(tRes);
}

/**
 * Apply generic, request method (and possibly type) independant security measures.
 * @param {ThreadReq} tReq Thread request object
 * @returns {Status} Status code
 */
function applyGenericGuards(tReq: ThreadReq): Status {
    // Check: Unsupported request method
    if(!["GET", "HEAD", "POST"].includes(tReq.method)) {
        return Status.UNSUPPORTED_METHOD;
    }

    // Check: URL length exceeded
    if(tReq.url.length > (PROJECT_CONFIG.read("limit", "urlLength") || Infinity)) {
        return Status.URL_EXCEEDED;
    }

    // Check: Rate (request limit) exceeded
    if(rateExceeded(tReq.ip)) {
        return Status.UNSUPPORTED_METHOD;
    }
    
    // Check: URL length exceeded
    if(rateExceeded(tReq.ip)) {
        return Status.UNSUPPORTED_METHOD;
    }

    return Status.SUCCESS;
}


parentPort.on("message", (tReq: ThreadReq) => {
    const secStatus: Status = applyGenericGuards(tReq);
    if(secStatus !== Status.SUCCESS) {
        return respond({
            status: secStatus
        } as ThreadRes);
    }

    // GET: File request (either a dynamic and static routine; based on filer type)
    // HEAD: Resembles a GET request, but without the transferral of content
    if(["GET", "HEAD"].includes(tReq.method))  {
        return respond(handleAsset(tReq), (tReq.method === "HEAD"));
    }

    // POST: Plug-in request
    if(tReq.method === "POST") {
        return respond(handlePlugin(tReq));
    }
});

