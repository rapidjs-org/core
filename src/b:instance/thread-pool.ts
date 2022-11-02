import { Worker as Thread, SHARE_ENV, BroadcastChannel } from "worker_threads";
import { join } from "path";

import { IBroadcastMessage } from "../interfaces";
import { MODE } from "../MODE";
import { APP_CONFIG } from "../config/APP_CONFIG";
import { ErrorControl } from "../ErrorControl";
import { AsyncMutex } from "../AsyncMutex";
import * as print from "../print";

import { IRequest, IResponse } from "./interfaces";


type TRegisteredResponse = (value: (IResponse|number)|PromiseLike<IResponse|number>) => void;

interface IPending {
    sReq: IRequest;
    resolve: TRegisteredResponse;
}

interface IActive {
    timeout: NodeJS.Timeout;
    resolve: TRegisteredResponse;
}


const broadcastChannel: BroadcastChannel = new BroadcastChannel("rapidjs-br");
const errorControl = new ErrorControl(() => {
	print.error(new RangeError(`${MODE.DEV ? "Instance" : "Cluster"} has shut down due to heavy error density in thread`));
	
    process.send({
        signal: "terminate"
    });
});
const threadMutex: AsyncMutex = new AsyncMutex();
const pendingRequests: IPending[] = [];
const idleThreads: Thread[] = [];
const activeThreads: Map<number, IActive> = new Map();


!MODE.DEV && process.on("uncaughtException", (err: Error) => print.error(err));

process.on("message", (message: IBroadcastMessage) => {
	threadMutex.lock(() => broadcastChannel.postMessage(message));
});


broadcastChannel.onmessage = (message: IBroadcastMessage) => {
    threadMutex.lock(() => process.send(message));
};


// TODO: Size management
create();


function create() {
    const thread = new Thread(join(__dirname, "./c:thread/thread"), {
        env: SHARE_ENV,
        workerData: {}
    });
    
    thread.on("message", (sRes: IResponse) => {
        activeThreads.get(thread.threadId).resolve(sRes);

        deactivate(thread); 
    });
    
    // TODO: Error recovery offset
    thread.on("error", err => {
        print.error(err);

        MODE.DEV
        && setImmediate(() => process.send({
            signal: "terminate"
        }));

        errorControl.feed();
    });
    
    thread.on("exit", (code: number) => {
        if(code === 0 || MODE.DEV) {
            return;
        }

        clean(thread.threadId);

        create();
    });

    idleThreads.push(thread);
}

function activate() {
    threadMutex.lock(() => {
        if(!pendingRequests.length || !idleThreads.length) {
            return;
        }

        const thread: Thread = idleThreads.shift();

        const request: IPending = pendingRequests.shift();

        thread.postMessage(request.sReq);

        activeThreads.set(thread.threadId, {
            resolve: request.resolve,
            timeout: setTimeout(() => {
                threadMutex.lock(() => {
                    activeThreads.get(thread.threadId).resolve(408);

                    deactivate(thread);
                });
            }, APP_CONFIG.limit.timeout)
        });
    });
}

function deactivate(thread: Thread) {
    threadMutex.lock(() => {
        clean(thread.threadId);

        idleThreads.push(thread);

        activate();
    });
}

function clean(threadId: number) {
    if(!activeThreads.has(threadId)) {
        return;
    }

    clearTimeout(activeThreads.get(threadId).timeout);

    activeThreads.delete(threadId);
}


export function register(sReq: IRequest): Promise<IResponse|number> {
    return new Promise((resolve: TRegisteredResponse) => {
        pendingRequests.push({
            resolve, sReq
        });

        activate();
    });
}