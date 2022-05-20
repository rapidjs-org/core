
// Parameter
const config = {
	periodLength: 60000
};


import { PROJECT_CONFIG } from "../config/config.PROJECT";
// TODO: Project config values for defaults upon instanciation or in each module? 


/**
 * Class representing a sliding window rate limiter.
 * @class
 */
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

	constructor(limit: number = PROJECT_CONFIG.read("limit", "requestsPerMin").number, windowSize = config.periodLength) {
		this.limit = limit;
		this.windowSize = windowSize;

		this.updateWindows();

		setInterval(() => {
			this.updateWindows();

			this.instantBlocks.clear();
		}, windowSize);
	}

	private updateWindows() {
		this.memory.previous = new Map(this.memory.current);
		this.memory.current.clear();

		this.windowPivot = Date.now();
	}

	private getCurrentWindowWeight(): number {
		// TODO: Dont re-calculate upon burst retrieval?
		return (Date.now() - this.windowPivot) / this.windowSize;
	}

	/**
	 * Check whether a client has exceeded the personal rate limit.
	 * @param {string} identifier - Client unique identifer (e.g. IP address)
	 * @return {boolean} - Whether the client has exceeded their personal rate for the moment
	 */
	public exceeded(identifier: string): boolean {
		if(this.instantBlocks.has(identifier)) {
			return true;
		}

		this.memory.current.set(identifier, (this.memory.current.get(identifier) || 0) + 1);

		const weight: number = this.getCurrentWindowWeight();
		const effectiveTotal: number = ((1 - weight) * (this.memory.previous.get(identifier) || 0)) + (weight * this.memory.current.get(identifier));
		
		const block: boolean = effectiveTotal > this.limit;
		
		block && this.instantBlocks.add(identifier);

		return block;
	}

}