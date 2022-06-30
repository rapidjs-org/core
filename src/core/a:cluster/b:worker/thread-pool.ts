/**
 * Module containing a self-initializing pool of request handler threads.
 */


import config from "../../src.config.json";

import { join } from "path";
import { Worker as Thread, BroadcastChannel, SHARE_ENV } from "worker_threads";

import { Config } from "../../config/Config";
import { print } from "../../print";
import { arrayify } from "../../util";

import { AsyncMutex } from "../AsyncMutex";

import { IRequest, IResponse } from "../../interfaces";
import { EStatus } from"./EStatus";
import { BroadcastMessage } from "../BroadcastMessage";
import { respond } from"./response";
import { bindHeadersFilter } from "./b:worker";
import { POOL_SIZE } from "../POOL_SIZE";


// TODO: Dynamic thread pool size strategy (burst times, ...)
// TODO: Print inform thread pool soze adaptions


interface IPendingReq {
	resId: number;
	tReq: IRequest;
}

interface IActiveReq extends IPendingReq {
	timeout: NodeJS.Timeout;
}


const idleThreads: Thread[] = [];
const activeReqs: Map<number, IActiveReq> = new Map();
const pendingReqs: IPendingReq[] = [];
const processingTimeout = Config["project"].read("limit", "processingTimeout").number;

const threadMutex = new AsyncMutex();
const broadcastChannel: BroadcastChannel = new BroadcastChannel(config.threadsBroadcastChannelName);

let activeTimeoutThreadId: number;
// TODO: No cluster if size is one?


// Create fixed amount of new, reusable threads
Array.from({ length: POOL_SIZE }, createThread);
// TODO: Use optimal / optimized size formula?
// TODO: Use config file parameter for size?
// TODO: Create new thread if repeatedly none idle upon request to find optimal pool size?


/**
 * Create a single request handler thread.
 */
function createThread() {
	threadMutex.lock(new Promise((resolve: (unknown?) => void) => {
		const thread = new Thread(join(__dirname, "./c:thread/c:thread.js"), {
			env: SHARE_ENV,	// Share env variables
			argv: process.argv.slice(2),	// Pass through CLI arguments
			workerData: BroadcastMessage.history	// Provide new thread with IPC history to replicate state
		});
		
		// Response listener (message provision)
		thread.on("message", () => {
			// Transient (one time) thread load completion listener
			resolve();

			thread.removeAllListeners("message");
			
			// Install permanent response listener
			thread.on("message", tRes => {
				deactivateThread(thread, tRes);
			});
		});

		// Error listener
		thread.on("error", err => {
			deactivateThread(thread, EStatus.INTERNAL_ERROR);
			
			print.info("An error occurred in a request processing thread");
			print.error(err);
		});
		
		// Erroneous thread termination listener
		// Create new thread thread to replace despawned thread
		thread.on("exit", code => {
			if(code === 0) {
				return;
			}

			!activeTimeoutThreadId
			&& deactivateThread(thread, EStatus.INTERNAL_ERROR);	// Not a timeout but thread internal error result
			activeTimeoutThreadId = null;

			activeReqs.delete(thread.threadId);

			createThread();
		});
		
		idleThreads.push(thread);
	}));
}

/**
 * Deactivate an active thread after having received an
 * acoording response by clearing associated request data
 * and marking it idle.
 * @param {Thread} thread Thread instance to deactivate
 * @param {number|IResponse} param Response object / status to perform on
 */
function deactivateThread(thread: Thread, param: number|IResponse) {
	const activeObject: IActiveReq = activeReqs.get(thread.threadId);

	if(!activeObject) {
		return;	// Routine could have been triggered by request unrelated thread error
	}

	try {
		clearTimeout(activeObject.timeout);	// Timeout could not exist (anymore)
	} finally {
		respond(param, activeObject.resId);
	}
	
	idleThreads.push(thread);
	
	// Activate next pending request from queue
	const nextPendingReq: IPendingReq = pendingReqs.shift()
	nextPendingReq
	&& activateThread(nextPendingReq.tReq, nextPendingReq.resId);
}


/**
 * Activate an idle thread with a certain request object.
 * If every thread is currently active, the request object
 * is pushed to the idel queue. If that queue has reached
 * a configured size, the request will immediately be closed
 * with a server error.
 * @param {IRequest} tReq Thread request object to perfrom on
 * @param {number} resId Request id for async response hook
 */
export function activateThread(tReq: IRequest, resId: number) {
	if(idleThreads.length === 0) {
		(pendingReqs.length >= Config["project"].read("limit", "pendingRequests").number)
		? respond(EStatus.SERVICE_UNAVAILABLE)
		: pendingReqs.push({
			resId, tReq
		});
		
		return;
	}
	
	const thread = idleThreads.shift();  // FIFO
	
	activeReqs.set(thread.threadId, {
		timeout: isFinite(processingTimeout)
		? setTimeout(() => {
			thread.terminate();	// Triggers replacement inherently

			activeTimeoutThreadId = thread.threadId;

			respond(EStatus.REQUEST_TIMEOUT);
		}, processingTimeout)
		: null,
		
		resId, tReq
	});
	
	// Filter HTTP request object for thread reduced request object
	thread.postMessage(tReq);
}


/**
 * Handle a received broadcast message.
 * If the message could be handled as it was addressed to a worker,
 * the function returns positively in order to tell the broadcast
 * hop not to forward the package to threads.
 * @param {BroadcastMessage|BroadcastMessage[]} broadcastMessage Received broadcast message
 * @returns {boolean} Whether the message has been addressed to a worker
 */
 function handleBroadcast(broadcastMessage: BroadcastMessage|BroadcastMessage[]): boolean {
	const broadcastMessageArray = arrayify(broadcastMessage) as BroadcastMessage[];

	if(broadcastMessageArray.length === 0) {
		return true;
	}

    for(const message of broadcastMessageArray) {
        switch(message.signal) {
            case "bindWorker":
				// Initialize worker functionality given an array of header names to
				// filter for being effective on request objects.
				bindHeadersFilter(message.data as string[]);

                return true;
        }
    }

	return false;
}

/**
 * Broadcast threads with uniform broadcast message.
 * Keep message history to provide to new threads in order to allow for individual
 * state replication.
 * @param {BroadcastMessage} broadcastMessage Broadcast signal
 */
process.on("message", (broadcastMessage: BroadcastMessage|BroadcastMessage[]) => {
	threadMutex.lock(() => {
		if(handleBroadcast(broadcastMessage)) {
			return;
		}
		
		broadcastChannel.postMessage(broadcastMessage);

		BroadcastMessage.pushHistory(broadcastMessage);	// Necessary for each isolated memoryspace
	});
});