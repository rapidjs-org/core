/**
 * Class representing a promise-based mutual exclusion context.
 * The context provides a scope for performing tasks on a shared
 * resource with sole access in order to prevent lost updates or
 * race conditions. 
 */


export class AsyncMutex {

	private readonly acquireQueue: ((value?: unknown) => void)[] = [];

	private isLocked: boolean;

	/**
	 * Acquire the context for exclusive resource manipulation
	 * or consumption.
	 * @returns {Promise} Promise resolving for instructions once resource is accessible
	 */
	private acquire() {
		if(!this.isLocked) {
			this.isLocked = true;

			return Promise.resolve();
		}

		return new Promise(resolve => {
			this.acquireQueue.push(resolve);
		});
	}

	/**
	 * Lock context with eventual instruction object.
	 * If the instruction object is a function it is synchronically invoked
	 * as a callback to be succeeded by the unlock. If given a promise, the
	 * unlock happens upon the respective resolve.
	 * Invocation once context can be acquired.
	 * @param {Function|Promise} instructions Instructions callback or promise
	 */
	public async lock(instructions: (() => void)|Promise<unknown>): Promise<unknown> {
		return new Promise((resolve: (unknown?) => void) => {
			this.acquire().then(() => {
				if(!(instructions instanceof Promise)) {
					instructions = new Promise<unknown>((resolve: (unknown) => void) => {
						const result: unknown = (instructions as Function)();
						
						resolve(result);
					});
				}
				
				instructions.then((result: unknown) => {
					(this.acquireQueue.length > 0)
						? this.acquireQueue.shift()()
						: (this.isLocked = false);
					
					resolve(result);
				});
			});
		});
	}

}