/**
 * Class representing a sliding window rate limiter. Two consequtive tracking
 * windows weighted by current window time in / complementary ([0, 1]) factor.
 * Limiting based on unique client identifier (e.g. IP address).
 */


const config = {
	periodLength: 60000
};

import { Config } from "../../config/Config";


export class RateLimiter {

	private readonly limit: number;
	private readonly windowSize: number;
	private readonly memory: {
		previous: Map<string, number>;
		current: Map<string, number>;
	} = {
		previous: new Map(),
		current: new Map()
	};
	private readonly instantBlocks: Set<string> = new Set();

	private windowPivot: number;

	/**
	 * @param {number} [limit] Rate limit size (limit as configured in project config file by default)
	 * @param {number} [windowSize] Window size in ms (one minute by default)
	 */
	constructor(limit: number = Config["project"].read("limit", "requestsPerMin").number, windowSize = config.periodLength) {
		this.limit = limit;
		this.windowSize = windowSize;

		this.clearWindows();

		setInterval(() => {
			this.clearWindows();

			this.instantBlocks.clear();
		}, windowSize);
	}

	/**
	 * Clear registration window maps.
	 */
	private clearWindows() {
		this.memory.previous = new Map(this.memory.current);
		this.memory.current.clear();

		this.windowPivot = Date.now();
	}

	/**
	 * Get weight of the current window (time in current window [0, 1]).
	 * Previous window weight results from 1 - current window weight (complementary on 1).
	 * @returns {number} Weight of current window
	 */
	private getCurrentWindowWeight(): number {
		// TODO: Dont re-calculate upon burst retrieval? (use tiny cache?)
		return (Date.now() - this.windowPivot) / this.windowSize;
	}

	/**
	 * Check whether a client has exceeded the personal rate limit.
	 * @param {string} identifier - Client unique identifer (e.g. IP address)
	 * @return {boolean} - Whether the client has exceeded their personal rate for the moment
	 */
	public validateClient(identifier: string): boolean {
		if(this.instantBlocks.has(identifier)) {
			return true;
		}

		this.memory.current.set(identifier, (this.memory.current.get(identifier) || 0) + 1);

		const weight: number = this.getCurrentWindowWeight();
		const effectiveTotal: number = ((1 - weight) * (this.memory.previous.get(identifier) || 0)) + (weight * this.memory.current.get(identifier));
		
		const hasExceeded: boolean = effectiveTotal > this.limit;
		
		hasExceeded && this.instantBlocks.add(identifier);

		return hasExceeded;
	}

}