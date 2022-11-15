import { join, dirname } from "path";

import { broadcast } from "../cluster";


export * as print from "../print";

export { destroy as shutdown } from "../cluster";

export function bindRequestHandler(handlerModulePath: string) {
    const originalStackTrace: ((err: Error, stackTraces: NodeJS.CallSite[]) => void) = Error.prepareStackTrace;
    
    const err: Error = new Error();

    Error.prepareStackTrace = (_, stackTraces) => stackTraces;

    const callerModulePath: string = (err.stack[1] as unknown as { getFileName: (() => string) }).getFileName();
    
    Error.prepareStackTrace = originalStackTrace;

    const requestHandlerModulePath: string = join(dirname(callerModulePath), handlerModulePath);

    broadcast("bind-request-handler", requestHandlerModulePath);
}