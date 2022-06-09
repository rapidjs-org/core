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

import { print } from "./print";
import { MODE } from "./MODE";

import { initCluster, workerBroadcast } from "./a:cluster/a:cluster";


// Pass through interface
export * from "./argument"; // TODO: Needed?
export * from "./print";
export * from "./MODE";

export * from "./config/Config"

export * from "./a:cluster/b:worker/HeadersMap";    // TODO: Expose? Or demand use of provided res object?
export * from "./a:cluster/b:worker/LimitDictionary";
export * from "./a:cluster/b:worker/Cache";

export * as util from "./util";

export { IRequest, IResponse } from "./a:cluster/b:worker/interfaces";
export { MutualClientError, MutualServerError } from "./a:cluster/b:worker/c:thread/MutualErrors";


// Request/response processor bind interface
export function bindRequestProcessor(headersFilter: string[], reqHandlerPath: string) {
    print.info(`Running ${print.format(`${MODE.DEV ? "DEV" : "PROD"} MODE`, [MODE.DEV ? print.Format.FG_RED : 0, print.Format.T_BOLD])}`);

    initCluster();

    workerBroadcast("bindWorker", headersFilter);
    workerBroadcast("bindThread", join(dirname(module.parent.filename), reqHandlerPath));   // TODO: Reconsider
    // TODO: How to prevent context mixing
}

// Plug-in interface
/**
 * Define handler to invoke upon each plug-in process.
 * @param {Function} pluginHandler Plug-in handler getting passed the plug-in data
 */
export function onPlugin(pluginHandler: (data: unknown) => void) {
    workerBroadcast("onPlugin", pluginHandler);
}

/**
 * Perform plug-in process.
 * @param {*} data Plug-in data 
 */
export function plugin(data: unknown) {
    workerBroadcast("plugin", data);
}