import { Worker as Thread, SHARE_ENV, BroadcastChannel } from "worker_threads";
import { cpus } from "os";
import { join } from "path";

import { IBroadcastMessage, IRequest, IResponse } from "../interfaces";
import { MODE } from "../MODE";
import { APP_CONFIG } from "../config/APP_CONFIG";
import { ErrorMonitor } from "../ErrorMonitor";
import { AsyncMutex } from "../AsyncMutex";
import { BroadcastEmitter } from "../Broadcast";
import * as print from "../print";



type TRegisteredResponse = (value: (IResponse|number)|PromiseLike<IResponse|number>) => void;

interface IPending {
    sReq: IRequest;
    resolve: TRegisteredResponse;
}

interface IActive {
    timeout: NodeJS.Timeout;
    resolve: TRegisteredResponse;
}


const baseSize: number = MODE.DEV ? 1 : cpus().length;	// TODO: Use elaborate algorithm to determine root size
const errorControl = new ErrorMonitor(() => {
	print.error(new RangeError(`${MODE.DEV ? "Instance" : "Cluster"} has shut down due to heavy error density in thread`));
	
    process.send({
        signal: "terminate"
    });
});
const threadMutex: AsyncMutex = new AsyncMutex();
const broadcastChannel: BroadcastChannel = new BroadcastChannel("rapidjs-br");
const broadcastEmitter: BroadcastEmitter = new BroadcastEmitter(message => {
    threadMutex.lock(() => {
        broadcastChannel.postMessage(message);
    });
});

const pendingRequests: IPending[] = [];
const idleThreads: Thread[] = [];
const activeThreads: Map<number, IActive> = new Map();


!MODE.DEV && process.on("uncaughtException", (err: Error) => print.error(err));


process.on("message", (message: IBroadcastMessage|IBroadcastMessage[]) => {
    broadcastEmitter.emit(message);
});

broadcastChannel.onmessage = (message: IBroadcastMessage) => {
    process.send(message);
};


// TODO: Size management

Array.from({ length: baseSize }, create);


function create() {
    threadMutex.lock(() => {
        const thread = new Thread(join(__dirname, "./c:thread/thread"), {
            env: SHARE_ENV,
            workerData: broadcastEmitter.recoverHistory()
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
    });
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