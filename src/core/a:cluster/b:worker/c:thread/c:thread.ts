/**
 * >> START OF INDEPENDANT MEMORY (C LEVEL) <<
 */


import config from "../../../src.config.json";

import { parentPort, BroadcastChannel, workerData } from "worker_threads";

import { arrayify } from "../../../util";

import { IRequest, IResponse } from "../interfaces";
import { HeadersMap } from "../HeadersMap";
import { BroadcastMessage } from "../../BroadcastMessage";

import { MutualError } from "./MutualErrors";


const broadcastChannel: BroadcastChannel = new BroadcastChannel(config.threadsBroadcastChannelName);

let boundReqHandler: (req: IRequest, res: IResponse) => IResponse = (_, res) => res;
let boundPluginHandler: (...args: unknown[]) => void;


parentPort.on("message", (tReq: IRequest) => {
    let tRes: IResponse = {
        cacheable: true,    // Use cache by default
        headers: new HeadersMap(),
        message: null,
        status: 200
    };

    try {
        tRes = boundReqHandler(tReq, tRes);
    } catch(err) {
        if(!(err instanceof MutualError)) {
            throw err;
        }

        tRes.message = err.message;
        tRes.status = err.status;
    }
    
    parentPort.postMessage(tRes);
});


/**
 * Handle a received broadcast message.
 * @param {BroadcastMessage|BroadcastMessage[]} broadcastMessage Received broadcast message
 */
function handleBroadcast(broadcastMessage: BroadcastMessage|BroadcastMessage[]) {
    arrayify(broadcastMessage)
    .forEach((message: BroadcastMessage) => {
        switch(message.signal) {
            case "bindThread":
                const data = message.data as {
                    initHandlerPath: string;
                    reqHandlerPath: string;

                    pluginHandlerPath?: string;
                };

                // Require initialization module (no exports / invocation)
                data.initHandlerPath
                && require(data.initHandlerPath);  

                // Bind singleton request handler
                // The handler module must export a default function with a
                // '(req: IRequest, res: IResponse) => IResponse' signature
                // in order to work accordingly (interfacves to be provided
                // by the core application interface)
                boundReqHandler = require(data.reqHandlerPath).default;  

                // Bind singleton plug-in handler (arbitrary data args signature)
                boundPluginHandler = data.pluginHandlerPath
                ? require(data.pluginHandlerPath).default
                : null;

                // TODO: Concise error(s) if wrong interface usage?
                break;
            case "onPlugin":
                // Perform a plug-in handling process (triggering the bound handler)
                boundPluginHandler(...(message.data as unknown[]));
                break;
        }
    });
}

 
/**
 * Thread initial broadcast history handling in order to replicate thread state.
 */
handleBroadcast(workerData);

parentPort.postMessage(0);  // Signal thread pool instance load completion

/**
 * Listen for (2-level effective) incoming IPC broadcast message packages.
 * Handle package data in respect to the given signal.
 */
broadcastChannel.onmessage = (message: MessageEvent) => {
    handleBroadcast(message.data as BroadcastMessage);
};