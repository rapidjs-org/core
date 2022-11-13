import { parentPort, workerData, BroadcastChannel } from "worker_threads";

import { IBroadcastMessage, IRequest, IResponse } from "../../interfaces";
import { MODE } from "../../MODE";
import { BroadcastAbsorber } from "../../Broadcast";
import * as print from "../../print";


const broadcastChannel: BroadcastChannel = new BroadcastChannel("rapidjs-br");
const broadcastAbsorber = new BroadcastAbsorber();

let shellRequestHandler: (sReq: IRequest) => IResponse;
const earlyRequests: IRequest[]= [];


!MODE.DEV && process.on("uncaughtException", (err: Error) => print.error(err));


broadcastAbsorber.on("bind-request-handler", async (requestHandlerModulePath: string) => {
    shellRequestHandler = (await import(requestHandlerModulePath)).default;

    if(!(shellRequestHandler instanceof Function)) {
        throw new TypeError(`Given request handler module must export request handler function as default 'Function: (IRequest) => IResponse' '${requestHandlerModulePath}`);
    }
    
    earlyRequests
    .forEach((sReq: IRequest) => handleRequest(sReq));
});

broadcastAbsorber.absorb(workerData);


broadcastChannel.onmessage = (message: { data: IBroadcastMessage|IBroadcastMessage[] }) => {
    broadcastAbsorber.absorb(message.data);
};


parentPort.on("message", (sReq: IRequest) => {
    if(!shellRequestHandler) {
        earlyRequests.push(sReq);

        return;
    }

    handleRequest(sReq);
});


function handleRequest(sReq: IRequest) {
    const sShellRes: IResponse = shellRequestHandler(sReq);
    
    parentPort.postMessage(sShellRes);
}