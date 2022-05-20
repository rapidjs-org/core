/**
 * >> START OF INDEPENDANT MEMORY (C LEVEL) <<
 */

import config from "../../app.config.json";

import { parentPort, BroadcastChannel, workerData } from "worker_threads";

import { EIPCSignal } from "../../EIPCSignal";
import { IIPCPackage } from "../../interfaces.A";

import { HeadersMap } from "../HeadersMap";
import { IPassivePlugin, IThreadReq, IThreadRes } from "../interfaces.B";

import handleAsset from "./handler/handler.asset";
import handlePlugin from "./handler/handler.plugin";
import { evalRequestInfo } from "./request-info";
import { registerActivePlugin, reloadActivePlugin } from "./plugin/registry";


const broadcastChannel: BroadcastChannel = new BroadcastChannel(config.threadsBroadcastChannelName);


parentPort.on("message", (tReq: IThreadReq) => {
	evalRequestInfo(tReq);	// TODO: Retrieve subdomain in net module (for redirects)
	const tRes: IThreadRes = {
		// Already set static headers with custom overrides
		// Relevant headers to be of ghigher priority for access throughout handler routine
		headers: new HeadersMap()
	};
	
	// GET: File request (either a dynamic and static routine; based on filer type)
	// HEAD: Resembles a GET request, but without the transferral of content
	if(["GET", "HEAD"].includes(tReq.method))  {
		tRes.headersOnly = (tReq.method === "HEAD");
		
		parentPort.postMessage(handleAsset(tReq, tRes));
		
		return;
	}
	
	// POST: Plug-in request
	parentPort.postMessage(handlePlugin(tReq, tRes));
});


function handleIpc(message: IIPCPackage[]) {
	message.forEach((message: IIPCPackage) => {
		switch(message.signal) {
		case EIPCSignal.PLUGIN_REGISTER: {
			registerActivePlugin(message.data as unknown as IPassivePlugin);	// TODO: Improve passing
	
			break;
		}
		case EIPCSignal.PLUGIN_RELOAD: {
			const data = message.data as unknown as IPassivePlugin;
			reloadActivePlugin(data.name, data.modulePath);
		
			break;
		}
		}
	});
} 

/**
 * Thread initial, multiple (already registered) plug-in connection directive.
 */
handleIpc(workerData);	// TODO: Request again if received empty list? Or always ask again?

/**
 * IPC:
 * Single (new) plug-in connection directive.
 */
broadcastChannel.onmessage = (message: MessageEvent) => {
	handleIpc(message.data as IIPCPackage[]);
};