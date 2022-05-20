
import { PROJECT_CONFIG } from "./config/config.PROJECT";

import { LimitedDictionary } from "./LimitedDictionary";


export class Cache<D> extends LimitedDictionary<number, D> {

	constructor(duration?: number, normalizationCallback?: (key: string) => string) {
		super(duration || PROJECT_CONFIG.read("cache", "server").number, normalizationCallback);
	}

	protected validateLimitReference(timestamp: number) {
		return ((timestamp + this.limit) > Date.now());
	}

	public has(key: string): boolean {
		return super.hasEntry(key);
	}

	public read(key: string): D {
		return super.getEntry(key);
	}

	public write(key: string, data: D) {
		super.setEntry(key, Date.now(), data);
	}
    
}