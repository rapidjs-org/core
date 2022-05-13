
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
import { IThreadReq, IThreadRes, IPassivePlugin } from  "./interfaces.B";


interface IActiveReq {
	eRes: http.ServerResponse;
	timeout: NodeJS.Timeout;
}


const idleThreads: Thread[] = [];
const activeReqs: Map<number, IActiveReq> = new Map();
const pendingReqs: {
	eRes: http.ServerResponse,
	tReq: IThreadReq
}[] = [];
const broadcastChannel: BroadcastChannel = new BroadcastChannel(config.threadsBroadcastChannelName);
const passivePluginRegistry: IPassivePlugin[] = [];
const processingTimeout = PROJECT_CONFIG.read("limit", "processingTimeout").number;
const staticCache: Cache<IThreadRes> = new Cache(null, (key: string) => {
	return normalize(key);
});

let activeTimeoutThreadId: number;


// Create fixed amount of new, reusable threads
// Defer in order to read connected plug-ins first
setImmediate(() => {
	Array.from({ length: (MODE.DEV ? 1 : --cpus().length) }, createThread);
	// TODO: Use optimal / optimized size formula?
	// TODO: Use config file parameter for size?
});


function handleThreadResult(threadId: number, param: number|IThreadRes) {
	const activeObject: IActiveReq = activeReqs.get(threadId);

	if(!activeObject) {
		return;	// Routine could have been triggered by request unrelated thread error
	}

	try {
		clearTimeout(activeObject.timeout);	// Timeout could not exist (anymore)
	} finally {
		respond(activeObject.eRes, param);
	}
}

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

		/* tRes.staticCacheKey
		&& staticCache.write(tRes.staticCacheKey, tRes); */
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

	idleThreads.push(thread);
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

	if(idleThreads.length === 0) {
		(pendingReqs.length >= PROJECT_CONFIG.read("limit", "pendingRequests").number)
			? respond(entity.eRes, Status.SERVICE_UNAVAILABKLE)
			: pendingReqs.push(entity);
		
		return;
	}

	const thread = idleThreads.shift();  // FIFO

	if(staticCache.has(entity.tReq.pathname)) {
		thread.postMessage(staticCache.read(entity.tReq.pathname));

		return;
	}

	activeReqs.set(thread.threadId, {
		eRes: entity.eRes,
		timeout: isFinite(processingTimeout)
		&& setTimeout(() => {
			thread.terminate();

			activeTimeoutThreadId = thread.threadId;

			respond(entity.eRes, Status.REQUEST_TIMEOUT);
		}, processingTimeout)
	});
	
	// Filter HTTP request object for thread reduced request object
	thread.postMessage(entity.tReq);
}

/*
 * IPC interface (top-down).
 */
export function ipcDown(message: TObject) {
	// TODO: IPC types
	switch(message.signal) {
		case IPCSignal.PLUGIN_REGISTER:
			// Intercept signal in order to keep track of already registered plug-ins for new thread creation processes
			passivePluginRegistry.push(message.data as IPassivePlugin);
			
			break;
	}

	broadcastChannel.postMessage(message);
}

process.on("message", ipcDown);	// Pass through master messages to threads