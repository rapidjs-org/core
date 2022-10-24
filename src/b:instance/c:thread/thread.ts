import { sign } from "crypto";
import { parentPort, BroadcastChannel } from "worker_threads";

import { IBroadcastMessage } from "../../interfaces";
import { BroadcastListener } from "../../BroadcastListener";

import { IRequest, IResponse} from "../interfaces";


const broadcastChannel: BroadcastChannel = new BroadcastChannel("rapidjs-br");
const broadcastListener = new BroadcastListener();


parentPort.on("message", (sReq: IRequest) => {
    // TODO: How to implement specific handler?
    // const sRes = boundRequestHandler(sReq); // TODO: Overload return value?
    // TODO: Accept promise return value?
    // TODO: Format constraint?
    const sRes: IResponse = {
        status: 200,
        message: sReq.url.hostname as string
    }; // TODO: Overload return value?
    
    parentPort.postMessage(sRes);
});


broadcastChannel.onmessage = (message: IBroadcastMessage) => {
    broadcastListener.emit(message);
};


function broadcastUp(message: IBroadcastMessage) {
    broadcastChannel.postMessage(message);
}