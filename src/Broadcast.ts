const devConfig = {
	absorbAnySignal: "*"
};


import { IBroadcastMessage } from "./interfaces";


type TBroadcastCallback = (data: string) => void;


export class BroadcastEmitter {

	private readonly emitter: (message: IBroadcastMessage[]) => void;
	private history: IBroadcastMessage[] = [];	// TODO: Assume signal override obsoletion?

	constructor(emitter?: ((message: IBroadcastMessage[]) => void)) {
		this.emitter = emitter;
	}

	public emit(message: IBroadcastMessage|IBroadcastMessage[]) {
		message = [ message ].flat();
		
		this.emitter(message);

		this.history = this.history.concat([ message ].flat());

		console.log("BC WITH hist: " + this.history.map(e => e.signal).join(", "));
	}
	
	public recoverHistory(): IBroadcastMessage[] {
		return this.history;
	}
}

export class BroadcastAbsorber  {

	private readonly broadcastListeners: Map<string, TBroadcastCallback[]> = new Map();

	public on(signal: string, callback: TBroadcastCallback) {
		this.broadcastListeners.set(signal, (this.broadcastListeners.get(signal) ?? []).concat([ callback ]));
	}

	public absorb(message: IBroadcastMessage|IBroadcastMessage[]) {
		[ message ].flat()
		.forEach((message: IBroadcastMessage) => {
			if(message.signal !== devConfig.absorbAnySignal
			&& !this.broadcastListeners.has(message.signal)) {
				return;
			}

			this.broadcastListeners.get(message.signal)
			.forEach((callback: TBroadcastCallback) => callback(message.data));
		});
	}

}