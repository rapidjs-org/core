/**
 * rapidJS core application.
 * 
 * @copyright (c) Thassilo Martin Schiepanski / t-ski@GitHub
 * 
 * Web server cluster with individualizable request handler threads.
 * Provides fundamental server configuration and security measures
 * favoring implementations of specific application environments.
 */


import { join, dirname } from "path";
import { appendFile } from "fs";

import { Config } from "./config/Config";
import { print } from "./print";
import { initCluster, workerBroadcast } from "./a:cluster/a:cluster";
import { MODE } from "./MODE";


// Pass through interface
export * from "./argument"; // TODO: Needed?
export * from "./print";
export * from "./LimitDictionary";
export * from "./Cache";
export * from "./MODE";
export * from "./PATH";
export * from "./IS_SECURE";
export * from "./config/Config"

export * as util from "./util";

export { IRequest, IResponse } from "./interfaces";
export { MutualClientError, MutualServerError } from "./MutualErrors";


// Request/response processor bind interface
/**
 * Bind an application specific request handler.
 * @param {string[]} headersFilter Array of relevant header names to write to each thread requesobject
 * @param {string} reqHandlerPath Application local request handler module path (requires default export with handler signature (see thread c:thread))
 */
export function bindRequestProcessor(headersFilter: string[], initHandlerPath: string, reqHandlerPath: string, pluginHandlerPath?: string) {
    print.info(`Running ${print.format(`${MODE.DEV ? "DEV" : "PROD"} MODE`, [MODE.DEV ? print.Format.FG_RED : 0, print.Format.T_BOLD])}`);

    initCluster();

    workerBroadcast("bindWorker", headersFilter);
    workerBroadcast("bindThread", {
        initHandlerPath: join(dirname(module.parent.filename), initHandlerPath),
        reqHandlerPath: join(dirname(module.parent.filename), reqHandlerPath),
        pluginHandlerPath: pluginHandlerPath ? join(dirname(module.parent.filename), pluginHandlerPath) : null
    });
    // TODO: How to prevent context mixing
}

/**
 * Expose plug-in connection interface meant to be exposed from the
 * concrete interface as well defining the data parameter accordingly.
 */
export function plugin(...args: unknown[]) {
    workerBroadcast("onPlugin", args);
}


/**
 * Set up log file behavior.
 */
Config["project"].read("directory", "log").string
&& print.all((_, message: string) => {
    // Write to log file if log directory path given via argument
    const date: Date = new Date();
    const day: string = date.toISOString().split("T")[0];
    const time: string = date.toLocaleTimeString();

    appendFile(join(Config["project"].read("directory", "log").string, `${day}.log`),
    `[${time}]: ${message}\n`,
    err => {
        if(err) {
            throw err;
        };
    });
});


//process.on("uncaughtException", _ => {});   // TODO: Why throws error in print.error()?