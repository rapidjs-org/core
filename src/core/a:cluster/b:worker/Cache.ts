/**
 * Class representing a cache. Implements a temporally limited dictionary
 */


import { Config } from "../../config/Config";

import { LimitDictionary } from "./LimitDictionary";


export class Cache<D> extends LimitDictionary<number, D> {

	/**
	 * @param {number} [duration] Optional specific caching duration (configured value by default)
	 * @param {Function} normalizationCallback Callback to be invoked on key access for normalized use
	 */
	constructor(duration?: number, normalizationCallback?: (key: string) => string) {
		super(duration || Config["project"].read("cache", "server").number, normalizationCallback);
	}

	/**
	 * Validate a current cache entry against the limit reference.
	 * @param {number} timestamp Reference timestamp (of entry)
	 * @returns {boolean} Whether the entry is still valid
	 */
	protected validateLimitReference(timestamp: number): boolean {
		return ((timestamp + this.limitDelta) <= Date.now());	// TODO: Check operator (>?)
	}

	/**
	 * Check whether a valid extry exists in cache for a given key.
	 * @param {string} key Entry key
	 * @returns {boolean} Whether a valid entry exists
	 */
	public has(key: string): boolean {
		return super.has(key);
	}

	/**
	 * Read an entry from the cache iff exists.
	 * @param {string} key Entry key
	 * @returns {D} Key associated data
	 */
	public read(key: string): D {
		return super.read(key);
	}

	/**
	 * Write an entry to the cache.
	 * @param {string} key Entry key
	 * @param {D} data Data to cache
	 */
	public write(key: string, data: D) {
		super.write(key, data, Date.now());
	}
    
}