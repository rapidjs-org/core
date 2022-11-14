const devConfig = {
	absorbAnySignal: "*"
};


import { IBroadcastMessage } from "./interfaces";


type TBroadcastCallback = (data: string) => void;


export class BroadcastEmitter {

	private readonly emitter: (message: IBroadcastMessage[]) => void;
	private readonly history: {
		dynamic: Map<string, string>,
		static: IBroadcastMessage[]
	} = {
		dynamic: new Map(),
		static: []
	};	// TODO: Assume signal override obsoletion?

	constructor(emitter?: ((message: IBroadcastMessage[]) => void)) {
		this.emitter = emitter;
	}

	public emit(message: IBroadcastMessage|IBroadcastMessage[]) {
		let hasUpdates: boolean = false;
		
		message = [ message ].flat();
		
		message.forEach((message: IBroadcastMessage) => {
			if(this.history.dynamic.get(message.signal) === message.data) {
				return;
			}

			this.history.dynamic.set(message.signal, message.data);

			hasUpdates = true;
		});

		if(!hasUpdates) {
			return;
		}

		const staticHistoryRepresentation: IBroadcastMessage[] = [];
		this.history.dynamic
		.forEach((data: string, signal: string) => {
			staticHistoryRepresentation.push({
				signal, data
			});
		});

		this.history.static = staticHistoryRepresentation;

		this.emitter(message);
	}
	
	public recoverHistory(): IBroadcastMessage[] {
		return this.history.static;
	}
}

export class BroadcastAbsorber  {

	private readonly broadcastListeners: Map<string, TBroadcastCallback[]> = new Map();
	
	public on(signal: string, callback: TBroadcastCallback) {
		this.broadcastListeners.set(signal, (this.broadcastListeners.get(signal) ?? []).concat([ callback ]));
	}

	public absorb(message: IBroadcastMessage[]) {
		message.forEach((message: IBroadcastMessage) => {
			if(!this.broadcastListeners.has(message.signal)
			&& !this.broadcastListeners.has(devConfig.absorbAnySignal)) {
				throw new RangeError(`Unhandled broadcast signal '${message.signal}'`);
			}

			(this.broadcastListeners.get(message.signal) ?? [])
			.concat(this.broadcastListeners.get(devConfig.absorbAnySignal) ?? [])
			.forEach((callback: TBroadcastCallback) => callback(message.data));
		});
	}

}