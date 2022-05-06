
import http from "http";
import { cpus } from "os";
import { Worker as Thread, SHARE_ENV, BroadcastChannel } from "worker_threads";
import { join } from "path";

import config from "../app.config.json";

import { print } from "../../print";

import { MODE } from "../mode";
import { IPCSignal } from "../IPCSignal";

import { Status } from"./Status";
import { respond } from"./response";


const idleThreads: Thread[] = [];
const activeReqs: Map<number, http.ServerResponse> = new Map();
const pendingReqs: {
	tReq: IThreadReq,
	tRes: IThreadRes,
	eRes: http.ServerResponse
}[] = [];
const broadcastChannel: BroadcastChannel = new BroadcastChannel(config.threadsBroadcastChannelName);
const passivePluginRegistry: IPassivePlugin[] = [];


// Create fixed amount of new, reusable threads
// Defer in order to read connected plug-ins first
setImmediate(_ => {
	Array.from({ length: (MODE.DEV ? 1 : --cpus().length) }, createThread);
	// TODO: Use config file parameter for size?
});

// TODO: Thread work timeout (to prevent deadlocks and iteration problems)
function createThread() {
	const thread = new Thread(join(__dirname, "./C:thread/thread.js"), {
		env: SHARE_ENV,
		argv: process.argv.slice(2),
		workerData: passivePluginRegistry
	});

	// Success (message provision) listener
	thread.on("message", tRes => {
		respond(activeReqs.get(thread.threadId), tRes);

		deactivateThread(thread);
	});
	
	// Thread error listener
	thread.on("error", err => {
		respond(activeReqs.get(thread.threadId), Status.INTERNAL_ERROR);  // TODO: Error response?
		
		createThread();

		// TODO: Error restart limit?
		// TODO: Do not print 'Unhandled error...'
		print.error(err);
	});
	
	// Erroneous thread close listener
	// Spawn new thread thread to replace despawned thread
	thread.on("exit", code => {
		if(code === 0) {
			return;
		}
		
		respond(activeReqs.get(thread.threadId), Status.INTERNAL_ERROR);  // TODO: Error response?  // TODO: Error response?
		
		createThread();
	});

	deactivateThread(thread);
}

function deactivateThread(thread: Thread) {
	idleThreads.push(thread);
	
	activateThread(pendingReqs.shift());
}

export function activateThread(entity: {
	tReq: IThreadReq,
	tRes: IThreadRes,
	eRes: http.ServerResponse
}) {
	if(entity === undefined) {
		return;
	}
	
	if(idleThreads.length === 0) {
		pendingReqs.push(entity);
		
		return;
	}

	const thread = idleThreads.shift();  // FIFO

	activeReqs.set(thread.threadId, entity.eRes);
	
	// Filter HTTP request object for thread reduced request object
	thread.postMessage({
		tReq: entity.tReq,
		tRes: entity.tRes
	});
}

export function broadcast(message: TObject) {
	broadcastChannel.postMessage(message);
}

/*
 * IPC interface (top-down).
 */
export function ipcDown(message: TObject) {
	// TODO: IPC types
	switch(message.type) {
	case IPCSignal.PLUGIN:
		broadcast(message.data as TObject);

		passivePluginRegistry.push(message.data as IPassivePlugin);
            
		break;
	}
}

process.on("message", ipcDown);