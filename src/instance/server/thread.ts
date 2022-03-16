
import { parentPort } from "worker_threads";

import handleStatic from "./handlers/static";


parentPort.on("message", (req: ThreadReq) => {
    switch(req.method.toUpperCase()) {
        case "GET":
            return handleStatic(req);
    }
});