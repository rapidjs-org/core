/**
 * Class representing an error controller residing on top
 * of current process' scope in order to intercept any
 * unhandled exception. At that, the process is secured
 * against failure based on unexpected errors. However, in
 * order to prevent error situations at application start
 * not to terminate the process, a keep alive timeout is
 * applied to its installation.
 */
export class ErrorControl {

    constructor(exceptionCallback: (err: Error) => void = (() => null), keepAliveDelay: number = 30000, suppressErrorLog: boolean = false) {
        setTimeout(() => {
            process.on("uncaughtException", (err: Error) => {
                !suppressErrorLog
                && console.error(err);
                
                exceptionCallback(err);
            });
        }, keepAliveDelay);
    }

}