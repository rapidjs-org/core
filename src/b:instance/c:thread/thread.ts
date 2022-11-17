process.argv[1] = process.argv.pop();


import { parentPort, workerData, BroadcastChannel } from "worker_threads";

import { IBroadcastMessage, IRequest, IResponse } from "../../interfaces";
import { MODE } from "../../MODE";
import { BroadcastAbsorber } from "../../Broadcast";
import * as print from "../../print";

import { EThreadStatus } from "../EThreadStatus";


type TShellAdapterHandler = ((shellAPI: unknown) => TShellRequestHandler);
type TShellRequestHandler = (sReq: IRequest) => IResponse;


const broadcastChannel: BroadcastChannel = new BroadcastChannel("rapidjs-bc");
const broadcastAbsorber = new BroadcastAbsorber();

let shellRequestHandler: TShellRequestHandler;
let earlyRequest: IRequest;


broadcastAbsorber.on("bind-request-handler", (requestHandlerModulePath: string) => {
    const tryBind = <T>(instructions: () => T) => {
        try {
            const handler: T = instructions();

            if(handler instanceof Function) {
                return handler;
            }
        } catch(err) {
            err && print.error(err);
        }

        throw new TypeError(`Given request handler must export adapter function as default 'Function: (shellAPI) => (Function: (IRequest) => IResponse)' '${requestHandlerModulePath}`);
    };


    const shellAPI = require("./api.shell");

    //process.argv[1] = requestHandlerModulePath;

    const shellAdapter = tryBind<TShellAdapterHandler>(() => require(requestHandlerModulePath));
    shellRequestHandler = tryBind<TShellRequestHandler>(() => shellAdapter(shellAPI));
    
    earlyRequest && handleRequest(earlyRequest);
    
    !MODE.DEV && process.on("uncaughtException", (err: Error) => print.error(err));

    parentPort.postMessage(EThreadStatus.BOUND);  // Bound status message
});

broadcastAbsorber.absorb(workerData);
 

broadcastChannel.onmessage = (message: { data: IBroadcastMessage[] }) => {
    broadcastAbsorber.absorb(message.data);
}


parentPort.postMessage(EThreadStatus.READY);  // Ready status message

parentPort.on("message", (sReq: IRequest) => {
    if(!shellRequestHandler) {
        earlyRequest = sReq;

        return;
    }
    
    handleRequest(sReq);
});


function handleRequest(sReq: IRequest) {
    try {
        const sShellRes: IResponse = shellRequestHandler(sReq);
        
        parentPort.postMessage(sShellRes);
    } catch(err) {
        
        // TODO: Error (500)
    }
}