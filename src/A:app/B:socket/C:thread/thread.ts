/**
 * >> START OF INDEPENDANT MEMORY (C LEVEL) <<
 */

import { parentPort } from "worker_threads";

import handleAsset from "./handler/handler.asset";
import handlePlugin from "./handler/handler.plugin";


/**
 * Respond from thread (message socket with individual data relevant for network response).
 * @param {ThreadRes} tRes Thread response object
 * @param {boolean} headerOnly Whether to only send headers
 */
function respond(tRes: ThreadRes, headerOnly: boolean = false) {
    parentPort.postMessage(tRes);
}

parentPort.on("message", (tReq: ThreadReq) => {
    const tRes: ThreadRes = {
        headers: new Map()
    };

    // GET: File request (either a dynamic and static routine; based on filer type)
    // HEAD: Resembles a GET request, but without the transferral of content
    if(["GET", "HEAD"].includes(tReq.method))  {
        return respond(handleAsset(tReq, tRes), (tReq.method === "HEAD"));
    }
    
    // POST: Plug-in request
    if(tReq.method === "POST") {
        return respond(handlePlugin(tReq, tRes));
    }
});