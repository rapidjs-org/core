
import http from "http";
import { cpus } from "os";
import { Worker as Thread, SHARE_ENV, BroadcastChannel } from "worker_threads";
import { normalize, join } from "path";

import config from "../app.config.json";

import { print } from "../../print";

import { MODE } from "../mode";
import { PROJECT_CONFIG } from "../config/config.project";
import { IPCSignal } from "../IPCSignal";
import { Cache } from"../Cache";

import { Status } from"./Status";
import { respond } from"./response";
import { IThreadReq, IThreadRes } from "./interfaces.thread";
import { IPassivePlugin } from  "./interfaces.plugin";


interface IActiveReq {
	eRes: http.ServerResponse;
	timeout: number;
}


const idleThreads: Thread[] = [];
const activeReqs: Map<number, IActiveReq> = new Map();
const pendingReqs: {
	eRes: http.ServerResponse,
	tReq: IThreadReq
}[] = [];
const broadcastChannel: BroadcastChannel = new BroadcastChannel(config.threadsBroadcastChannelName);
const passivePluginRegistry: IPassivePlugin[] = [];
const processingTimeout = 5000;//PROJECT_CONFIG.read("limit", "processingTimeout").number;
const staticCache: Cache<IThreadRes> = new Cache(null, (key: string) => {
	return normalize(key);
});

let activeTimeoutThreadId: number;


// Create fixed amount of new, reusable threads
// Defer in order to read connected plug-ins first
setImmediate(_ => {
	Array.from({ length: (MODE.DEV ? 1 : --cpus().length) }, createThread);
	// TODO: Use config file parameter for size?
});


function handleThreadResult(threadId: number, param: number|IThreadRes) {
	const activeObject: IActiveReq = activeReqs.get(threadId);	// TODO: Deactivate helper

	try {
		clearTimeout(activeObject.timeout);	// Timeout could not exist (anymore)
	} finally {
		respond(activeObject.eRes, param);
	}
}

// TODO: Thread work timeout (to prevent deadlocks and iteration problems)
function createThread() {
	const thread = new Thread(join(__dirname, "./C:thread/thread.js"), {
		env: SHARE_ENV,
		argv: process.argv.slice(2),
		workerData: passivePluginRegistry
	});
	
	// Success (message provision) listener
	thread.on("message", tRes => {
		handleThreadResult(thread.threadId, tRes);

		deactivateThread(thread);

		tRes.staticCacheKey
		&& staticCache.write(tRes.staticCacheKey, tRes);
	});
	
	// Thread error listener
	thread.on("error", err => {
		handleThreadResult(thread.threadId, Status.INTERNAL_ERROR);
		
		deactivateThread(thread);
		
		print.error(err);

		// TODO: Fires on handled errors, too; check if was handled?
	});
	
	// Erroneous thread close listener
	// Spawn new thread thread to replace despawned thread
	thread.on("exit", code => {
		if(code === 0) {
			return;
		}

		!activeTimeoutThreadId
		&& handleThreadResult(thread.threadId, Status.INTERNAL_ERROR);	// Not a timeout but thread internal error result
		activeTimeoutThreadId = null;

		activeReqs.delete(thread.threadId);

		createThread();

		// TODO: Error restart limit?
	});

	deactivateThread(thread);
}

function deactivateThread(thread: Thread) {
	idleThreads.push(thread);
	
	activateThread(pendingReqs.shift());
}

export function activateThread(entity: {
	tReq: IThreadReq,
	eRes: http.ServerResponse
}) {
	if(entity === undefined) {
		return;
	}

	if(staticCache.has(entity.tReq.pathname)) {
		return staticCache.read(entity.tReq.pathname);
	}

	if(idleThreads.length === 0) {
		(pendingReqs.length >= PROJECT_CONFIG.read("limit", "pendingRequests").number)
			? respond(entity.eRes, Status.SERVICE_UNAVAILABKLE)
			: pendingReqs.push(entity);
		
		return;
	}

	const thread = idleThreads.shift();  // FIFO

	activeReqs.set(thread.threadId, {
		eRes: entity.eRes,
		timeout: isFinite(processingTimeout)
		&& setTimeout(_ => {
			thread.terminate();

			activeTimeoutThreadId = thread.threadId;

			respond(entity.eRes, Status.REQUEST_TIMEOUT);
		}, processingTimeout)
	});
	
	// Filter HTTP request object for thread reduced request object
	thread.postMessage(entity.tReq);
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