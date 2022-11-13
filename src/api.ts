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
import { join, dirname } from "path";

import { EVENT_EMITTER } from "./EVENT_EMITTER";
import { MODE } from "./MODE";
import { parseFlag } from "./args";
import { init as initCluster, destroy as destroyCluster } from "./cluster";
import { registerFree } from "./shared-memory/shared-memory-api";
import { broadcast } from "./cluster";
import * as print from "./print";


if(parseFlag("help", "H")) {    // TODO: Global bin?
    process.stdout.write(
        String(readFileSync(join(__dirname, "./help.txt")))
        .replace(/(https?:\/\/[a-z0-9/._-]+)/ig, "\x1b[38;2;255;71;71m$1\x1b[0m")
        + "\n"
    );
    
    process.exit(0);

    // TODO: Make extensible
}

    // TODO: Solo node mode (flag)

let isInitializing = true;
setTimeout(() => {
    isInitializing = false;
}, 2000);
process.on("uncaughtException", (err: Error) => {
    // TODO: Timeout
    print.error(err);

    isInitializing
    && setImmediate(() => process.exit(1));
});


registerFree([ "uncaughtException", "unhandledRejection" ], 1);
registerFree([ "SIGTERM", "SIGINT", "SIGQUIT", "exit" ]);


initCluster();


print.info(`Started server cluster running \x1b[1m${MODE.DEV ? "\x1b[38;2;224;0;0mDEV" : "PROD"} MODE\x1b[0m`);
// TODO: Display specific app name of implementation?


export const shellAPI = {
    
    print: print,

    bindRequestHandler: function (handlerModulePath: string) {
        const originalStackTrace: ((err: Error, stackTraces: NodeJS.CallSite[]) => void) = Error.prepareStackTrace;
        
        const err: Error = new Error();
    
        Error.prepareStackTrace = (_, stackTraces) => stackTraces;
    
        const callerModulePath: string = (err.stack[1] as unknown as { getFileName: (() => string) }).getFileName();
        
        Error.prepareStackTrace = originalStackTrace;
    
        const requestHandlerModulePath: string = join(dirname(callerModulePath), handlerModulePath);

        broadcast("bind-request-handler", requestHandlerModulePath);
    },

    shutdown: destroyCluster

}

export const individualAPI = {

    on: function (event: string, callback: (...args: unknown[]) => void) {
        EVENT_EMITTER.on(event, callback);
    },

    logToFile: print.logToFile

}