import { Worker as Thread, SHARE_ENV, BroadcastChannel } from "worker_threads";
import { join } from "path";

import { IBroadcastMessage } from "../interfaces";
import { APP_CONFIG } from "../config/APP_CONFIG";
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
const threadMutex: AsyncMutex = new AsyncMutex();

const pendingRequests: IPending[] = [];
const idleThreads: Thread[] = [];
const activeThreads: Map<number, IActive> = new Map();


process.on("message", (message: IBroadcastMessage) => {
	threadMutex.lock(() => {
        broadcastChannel.postMessage(message);
	});
});


broadcastChannel.onmessage = (message: IBroadcastMessage) => {
    threadMutex.lock(() => {
        process.send(message);
    });
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

    const id: number = thread.threadId;

    const handleThreadError = () => {        
        process.send({
            signal: "feed-error-cotrol"
        });
    };
    
    thread.on("error", err => {
        print.error(err);

        handleThreadError();
    });
    
    thread.on("exit", (code: number) => {
        if(code === 0) {
            return;
        }

        clean(thread.threadId);

        create();
        
        handleThreadError();
        
        setTimeout(_ => {console.log(idleThreads.length)}, 10)
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