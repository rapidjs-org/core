/**
 * >> START OF INDEPENDANT MEMORY (C LEVEL) <<
 */

import config from "../../app.config.json";

import { parentPort, BroadcastChannel, workerData } from "worker_threads";

import { mergeObj } from "../../../util";

import { PROJECT_CONFIG } from "../../config/config.project";

import { HeadersMap } from "../HeadersMap";

import handleAsset from "./handler/handler.asset";
import handlePlugin from "./handler/handler.plugin";
import { evalRequestInfo } from "./request-info";
import { registerActivePlugin } from "./plugin/registry";

import "./live/ws-server";
import "./live/watch";


/**
 * Respond from thread (message socket with individual data relevant for network response).
 * @param {IThreadRes} tRes Thread response object
 * @param {boolean} headerOnly Whether to only send headers
 */
function respond(tRes: IThreadRes) {
	parentPort.postMessage(tRes);
}

parentPort.on("message", (post: {
    tReq: IThreadReq
}) => {
	evalRequestInfo(post.tReq);

	const tRes: IThreadRes = {
		// Already set static headers with custom overrides
		// Relevant headers to be of ghigher priority for access throughout handler routine
		headers: new HeadersMap(mergeObj({
			"Server": "rapidJS"
		}, (PROJECT_CONFIG.read("customHeaders").object || {}) as TObject) as Record<string, string>)
	};
	
	// GET: File request (either a dynamic and static routine; based on filer type)
	// HEAD: Resembles a GET request, but without the transferral of content
	if(["GET", "HEAD"].includes(post.tReq.method))  {
		tRes.headersOnly = (post.tReq.method === "HEAD");
		
		respond(handleAsset(post.tReq, tRes));
		
		return;
	}
    
	// POST: Plug-in request
	respond(handlePlugin(post.tReq, tRes));
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