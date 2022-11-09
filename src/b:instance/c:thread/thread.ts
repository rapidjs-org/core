import { parentPort, workerData, BroadcastChannel } from "worker_threads";

import { IBroadcastMessage, IRequest, IResponse } from "../../interfaces";
import { MODE } from "../../MODE";
import { BroadcastAbsorber } from "../../Broadcast";
import * as print from "../../print";


const broadcastChannel: BroadcastChannel = new BroadcastChannel("rapidjs-br");
const broadcastAbsorber = new BroadcastAbsorber();


!MODE.DEV && process.on("uncaughtException", (err: Error) => print.error(err));


broadcastAbsorber.on("ttt", (data: string) => {
    /* console.log("Broadcast [ttt]:");
    console.log(data); */
});


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


broadcastChannel.onmessage = (message: { data: IBroadcastMessage|IBroadcastMessage[] }) => {
    broadcastAbsorber.absorb(message.data);
};

//console.log(workerData);