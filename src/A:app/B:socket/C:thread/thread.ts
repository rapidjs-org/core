/**
 * >> START OF INDEPENDANT MEMORY (C LEVEL) <<
 */

import { parentPort, BroadcastChannel, workerData } from "worker_threads";

import config from "../../app.config.json";

import handleAsset from "./handler/handler.asset";
import handlePlugin from "./handler/handler.plugin";
import { registerActivePlugin } from "./plugin";


/**
 * Respond from thread (message socket with individual data relevant for network response).
 * @param {IThreadRes} tRes Thread response object
 * @param {boolean} headerOnly Whether to only send headers
 */
function respond(tRes: IThreadRes, headerOnly: boolean = false) {
    parentPort.postMessage(tRes);
}

parentPort.on("message", (post: {
    tReq: IThreadReq,
    tRes: IThreadRes
}) => {
    // GET: File request (either a dynamic and static routine; based on filer type)
    // HEAD: Resembles a GET request, but without the transferral of content
    if(["GET", "HEAD"].includes(post.tReq.method))  {
        return respond(handleAsset(post.tReq, post.tRes), (post.tReq.method === "HEAD"));
    }
    
    // POST: Plug-in request
    if(post.tReq.method === "POST") {
        return respond(handlePlugin(post.tReq, post.tRes));
    }
});


/**
 * Multiple (already registered) plug-in connection directive.
 */
workerData.forEach(passivePlugin => {
    registerActivePlugin(passivePlugin);
});


/**
 * IPC:
 * Single (new) plug-in connection directive.
 */
const broadcastChannel: BroadcastChannel = new BroadcastChannel(config.threadsBroadcastChannelName);
broadcastChannel.onmessage = (message: Record<string, any>) => {
    registerActivePlugin(message.data);
};