import { parentPort, BroadcastChannel } from "worker_threads";

import { IBroadcastMessage } from "../../interfaces";
import { MODE } from "../../MODE";
import { BroadcastListener } from "../../BroadcastListener";
import * as print from "../../print";

import { IRequest, IResponse} from "../interfaces";


const broadcastChannel: BroadcastChannel = new BroadcastChannel("rapidjs-br");
const broadcastListener = new BroadcastListener();


!MODE.DEV && process.on("uncaughtException", (err: Error) => print.error(err));


parentPort.on("message", (sReq: IRequest) => {
    // TODO: How to implement specific handler?
    // const sRes = boundRequestHandler(sReq); // TODO: Overload return value?
    // TODO: Accept promise return value?
    // TODO: Format constraint?
    const sRes: IResponse = {
        status: 200,
        message: sReq.url.hostname as string
    }; // TODO: Overload return value?

    // TODO: Wrap sReq properties with dynamic interfaces?
    console.log(sReq);
    parentPort.postMessage({
        status: 200,
        message: sReq.url.hostname as string
    });
});


broadcastChannel.onmessage = (message: IBroadcastMessage) => {
    broadcastListener.emit(message);
};


function broadcastUp(message: IBroadcastMessage) {
    broadcastChannel.postMessage(message);
}