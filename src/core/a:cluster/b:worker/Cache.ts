/**
 * Class representing a cache. Implements a temporally limited dictionary
 */


import { Config } from "../../config/Config";

import { LimitDictionary } from "./LimitDictionary";


export class Cache<D> extends LimitDictionary<number, D> {

	constructor(duration?: number, normalizationCallback?: (key: string) => string) {
		super(duration || Config["project"].read("cache", "server").number, normalizationCallback);
	}

	protected validateLimitReference(timestamp: number) {
		return ((timestamp + this.limitDelta) > Date.now());
	}

	public has(key: string): boolean {
		return super.has(key);
	}

	public read(key: string): D {
		return super.read(key);
	}

	public write(key: string, data: D) {
		super.write(key, data, Date.now());
	}
    
}