import { IBroadcastMessage } from "./interfaces";


type TBroadcastCallback = (data: string) => void;


export class BroadcastListener {

	private readonly eventListeners: Map<string, TBroadcastCallback[]> = new Map();

	public on(signal: string, callback: TBroadcastCallback) {
		this.eventListeners.set(signal, (this.eventListeners.get(signal) ?? []).concat([ callback ]));
	}

	public emit(message: IBroadcastMessage) {
		if(!this.eventListeners.has(message.signal)) {
			return;
		}

		this.eventListeners.get(message.signal)
		.forEach((callback: TBroadcastCallback) => callback(message.data));
	}
	
}