/**
 * >> START OF INDEPENDANT MEMORY (C LEVEL) <<
 */

import config from "../../app.config.json";

import { parentPort, BroadcastChannel, workerData } from "worker_threads";

import { HeadersMap } from "../HeadersMap";
import { IPassivePlugin } from "../interfaces.plugin";
import { IThreadReq, IThreadRes } from "../interfaces.thread";

import handleAsset from "./handler/handler.asset";
import handlePlugin from "./handler/handler.plugin";
import { evalRequestInfo } from "./request-info";
import { registerActivePlugin } from "./plugin/registry";


/**
 * Respond from thread (message socket with individual data relevant for network response).
 * @param {IThreadRes} tRes Thread response object
 * @param {boolean} headerOnly Whether to only send headers
 */
function respond(tRes: IThreadRes) {
	parentPort.postMessage(tRes);
}

parentPort.on("message", (tReq: IThreadReq) => {
	evalRequestInfo(tReq);
	
	const tRes: IThreadRes = {
		// Already set static headers with custom overrides
		// Relevant headers to be of ghigher priority for access throughout handler routine
		headers: new HeadersMap()
	};
	
	// GET: File request (either a dynamic and static routine; based on filer type)
	// HEAD: Resembles a GET request, but without the transferral of content
	if(["GET", "HEAD"].includes(tReq.method))  {
		tRes.headersOnly = (tReq.method === "HEAD");
		
		respond(handleAsset(tReq, tRes));
		
		return;
	}
	
	// POST: Plug-in request
	respond(handlePlugin(tReq, tRes));
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