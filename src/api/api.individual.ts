import { EVENT_EMITTER } from "../EVENT_EMITTER";


export { logToFile } from "../print";

export function on (event: string, callback: (...args: unknown[]) => void) {
    EVENT_EMITTER.on(event, callback);
}