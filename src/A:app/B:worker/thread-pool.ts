
import http from "http";
import { cpus } from "os";
import { Worker as Thread, SHARE_ENV, BroadcastChannel } from "worker_threads";
import { normalize, join } from "path";

import config from "../app.config.json";

import { print } from "../../print";

import { MODE } from "../MODE";
import { PROJECT_CONFIG } from "../config/config.PROJECT";
import { Cache } from"../Cache";
import { ErrorControl } from"../ErrorControl";
import { IIPCPackage } from "../interfaces.A";

import { EStatus } from"./EStatus";
import { respond } from"./response";
import { IThreadReq, IThreadRes } from  "./interfaces.B";


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
const processingTimeout = PROJECT_CONFIG.read("limit", "processingTimeout").number;
const staticCache: Cache<IThreadRes> = new Cache(null, (key: string) => {
	return normalize(key);
});
const ipcHistory: IIPCPackage[] = [];
const threadErrorControl = new ErrorControl("Density of errors caused in request processing thread(s) too high");

let activeTimeoutThreadId: number;


// Create fixed amount of new, reusable threads
// Defer in order to read connected plug-ins first
setImmediate(() => {
	Array.from({ length: (MODE.DEV ? 1 : --cpus().length) }, createThread);
	// TODO: Use optimal / optimized size formula?
	// TODO: Use config file parameter for size?

	// TODO: Create new thread if repeatedly none idle upon request to find optimal pool size?
});


function createThread() {
	const thread = new Thread(join(__dirname, "./C:thread/thread.js"), {
		env: SHARE_ENV,
		argv: process.argv.slice(2),
		workerData: ipcHistory
	});

	// Success (message provision) listener
	thread.on("message", tRes => {
		tRes.staticCacheKey
		&& staticCache.write(tRes.staticCacheKey, tRes);

		deactivateThread(thread, tRes);
	});
	
	// Thread error listener
	thread.on("error", err => {
		deactivateThread(thread, EStatus.INTERNAL_ERROR);
		
		print.debug("An error occurred in a request processing thread");
		print.error(err);

		threadErrorControl.feed();
	});
	
	// Erroneous thread close listener
	// Spawn new thread thread to replace despawned thread
	thread.on("exit", code => {
		if(code === 0) {
			return;
		}

		!activeTimeoutThreadId
		&& deactivateThread(thread, EStatus.INTERNAL_ERROR);	// Not a timeout but thread internal error result
		activeTimeoutThreadId = null;

		activeReqs.delete(thread.threadId);

		createThread();

		// TODO: Error restart limit?
	});
	
	idleThreads.push(thread);
}

function deactivateThread(thread: Thread, param: number|IThreadRes) {
	const activeObject: IActiveReq = activeReqs.get(thread.threadId);

	if(!activeObject) {
		return;	// Routine could have been triggered by request unrelated thread error
	}

	try {
		clearTimeout(activeObject.timeout);	// Timeout could not exist (anymore)
	} finally {
		respond(activeObject.eRes, param);
	}
	
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
		respond(entity.eRes, staticCache.read(entity.tReq.pathname));

		return;
	}

	if(idleThreads.length === 0) {
		(pendingReqs.length >= PROJECT_CONFIG.read("limit", "pendingRequests").number)
			? respond(entity.eRes, EStatus.SERVICE_UNAVAILABKLE)
			: pendingReqs.push(entity);
		
		return;
	}

	const thread = idleThreads.shift();  // FIFO
	
	activeReqs.set(thread.threadId, {
		eRes: entity.eRes,
		timeout: isFinite(processingTimeout)
		&& setTimeout(() => {
			thread.terminate();

			activeTimeoutThreadId = thread.threadId;

			respond(entity.eRes, EStatus.REQUEST_TIMEOUT);
		}, processingTimeout)
	});
	
	// Filter HTTP request object for thread reduced request object
	thread.postMessage(entity.tReq);
}

/*
 * IPC interface (top-down).
 */
export function ipcDown(message: IIPCPackage[]) {
	broadcastChannel.postMessage(message);
	
	message.forEach((message: IIPCPackage) => {
		ipcHistory.push(message);
	});
}

process.on("message", ipcDown);	// Instant pass through (from master to thread(s))