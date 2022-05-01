
import { MODE } from "../../mode";
import { PROJECT_CONFIG } from "../../config/config.project";

import { LimitedDictionary } from "./LimitedDictionary";


export class Cache<D> extends LimitedDictionary<number, D> {

	constructor(duration?: number, normalizationCallback?: (key: string) => string) {
		super(MODE.PROD
			? duration || PROJECT_CONFIG.read("cachingDuration", "server").number
			: Infinity
		, normalizationCallback);
	}

	protected validateLimitReference(timestamp: number) {
		return ((timestamp + this.limit) > Date.now());
	}

	public read(key: string): D {
		return super.get(key);
	}

	public write(key: string, data: D) {
		super.set(key, Date.now(), data);
	}
    
}