export class AsyncMutex {

	private readonly acquireQueue: ((value?: unknown) => void)[] = [];

	private isLocked = false;

	private acquire(prioritize: boolean) {
		 if(!this.isLocked) {
			this.isLocked = true;
			
			return Promise.resolve();
		}
		
		return new Promise(resolve => {
			this.acquireQueue[prioritize ? "unshift" : "push"](resolve);
		});
	}

	public lock(instructions: (() => void)|Promise<unknown>, prioritize = false): Promise<unknown> {
		return new Promise((resolve, reject) => {
			this.acquire(prioritize)
			.then(() => {
				(!(instructions instanceof Promise)
				? new Promise<unknown>(r => r(instructions()))
				: instructions)
                .then((result: unknown) => resolve(result))
				.catch((err: Error) => reject(err))
				.finally(() => {
					this.acquireQueue.length
					? this.acquireQueue.shift()()
					: (this.isLocked = false);
				});
			});
		});
	}

}