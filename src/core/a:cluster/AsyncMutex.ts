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
	 * @param {Function} callback Instructions callback
	 */
	public async lock(instructions: (() => void)|Promise<void>) {
		this.acquire().then(() => {
			if(!(instructions instanceof Promise)) {
				instructions = new Promise((resolve: () => void) => {
					(instructions as Function)();
					
					resolve();
				});
			}
			
			instructions.then(() => {
				(this.acquireQueue.length > 0)
					? this.acquireQueue.shift()()
					: (this.isLocked = false);
			});
		});
	}

}