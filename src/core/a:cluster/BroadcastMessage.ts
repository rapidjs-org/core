/**
 * Class representing a broadcast message package with processing
 * type information.
 * 
 */


export type TBroadcastSignal = "bindWorker" | "bindThread" | "onPlugin" | "plugin";


export class BroadcastMessage {

    public static history: BroadcastMessage[] = [];

    public readonly signal: TBroadcastSignal;
    public readonly data: unknown;

    constructor(signal: TBroadcastSignal, data: unknown) {
    	this.signal = signal;
    	this.data = data;
    }

    public static pushHistory(obj: BroadcastMessage|BroadcastMessage[]) {
        Array.isArray(obj)
        ? this.history.concat(obj)
        : this.history.push(obj);
    }

}