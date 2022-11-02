/**
 * rapidJS: Blazing fast web server framework.
 * Core application entry module.
 * 
 * (c) Thassilo Martin Schiepanski
 * 
 * @author Thassilo Martin Schiepanski
 * @author t-ski@GitHub
 */


import { readFileSync } from "fs";
import { join } from "path";

import { EVENT_EMITTER } from "./EVENT_EMITTER";
import { MODE } from "./MODE";
import { APP_CONFIG } from "./config/APP_CONFIG";
import { parseFlag } from "./args";
import { init as initCluster } from "./cluster";
import * as print from "./print";


if(parseFlag("help", "H")) {    // TODO: Global bin?
    console.log(String(readFileSync(join(__dirname, "./help.txt"))));
    
    process.exit(0);

    // TODO: Make extensible
}


let isInitializing: boolean = true;
setTimeout(() => {
    isInitializing = false;
}, 2000);
process.on("uncaughtException", (err: Error) => {
    // TODO: Timeout
    print.error(err);

    isInitializing
    && setImmediate(() => process.exit(1));
});


EVENT_EMITTER.on("listening", () => {
    print.info(`Server listening on port ${APP_CONFIG.port}`);
});    // TODO: Display start message (count nodes for correct cardinality)


initCluster();


print.info(`Started server cluster. Running ${
    `\x1b[1m${MODE.DEV ? "\x1b[38;2;224;0;0mDEV" : "PROD"} MODE\x1b[0m`
}.`);  // TODO: Display specific app name of implementation?


export function on(event: string, callback: (...args: unknown[]) => void) {
    EVENT_EMITTER.on(event, callback);
}