/**
 * Individual server application interface.
 * To be utilized for environment initialization (plug-ins, ...).
 */


import pluginHandler from "../plugin/handler";


export function plugin(...args: unknown[]) {
    pluginHandler.apply(args);
}


/* export const events = {
    log: printEventEmitter
}; */  // TODO: More vents (cache hit, connection, ...)