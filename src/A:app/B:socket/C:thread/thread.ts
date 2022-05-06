/**
 * >> START OF INDEPENDANT MEMORY (C LEVEL) <<
 */

import { parentPort, BroadcastChannel, workerData } from "worker_threads";

import http from "http";

import config from "../../app.config.json";

import handleAsset from "./handler/handler.asset";
import handlePlugin from "./handler/handler.plugin";
import { defineRequestInfo } from "./request-info";
import { registerActivePlugin } from "./plugin/registry";


/**
 * Respond from thread (message socket with individual data relevant for network response).
 * @param {IThreadRes} tRes Thread response object
 * @param {boolean} headerOnly Whether to only send headers
 */
function respond(tRes: IThreadRes, headerOnly: boolean = false) {
	tRes.message = !Buffer.isBuffer(tRes.message)
	? Buffer.from(tRes.message ? tRes.message : http.STATUS_CODES[tRes.status], "utf-8")
	: tRes.message;

	tRes.headers.set("Content-Length", Buffer.byteLength(tRes.message, "utf-8"));
	
	tRes.message = headerOnly
	? null
	: tRes.message;

	parentPort.postMessage(tRes);
}

parentPort.on("message", (post: {
    tReq: IThreadReq,
    tRes: IThreadRes
}) => {
	defineRequestInfo(post.tReq);

	// GET: File request (either a dynamic and static routine; based on filer type)
	// HEAD: Resembles a GET request, but without the transferral of content
	if(["GET", "HEAD"].includes(post.tReq.method))  {
		respond(handleAsset(post.tReq, post.tRes), (post.tReq.method === "HEAD"));

		return;
	}
    
	// POST: Plug-in request
	respond(handlePlugin(post.tReq, post.tRes));
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
broadcastChannel.onmessage = (message: TObject) => {
	registerActivePlugin(message.data as IPassivePlugin);
};