
import { parentPort } from "worker_threads";


export function respond(workerRes: ThreadRes) {
    parentPort.postMessage(workerRes);
}