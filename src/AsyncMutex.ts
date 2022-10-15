export class AsyncMutex {

	private readonly acquireQueue: ((value?: unknown) => void)[] = [];

	private isLocked: boolean = false;

	private acquire(prioritize: boolean) {
		 if(!this.isLocked) {
			this.isLocked = true;
			
			return Promise.resolve();
		}
		
		return new Promise(resolve => {
			this.acquireQueue[prioritize ? "unshift" : "push"](resolve);
		});
	}

	public lock(instructions: (() => void)|Promise<unknown>, prioritize: boolean = false): Promise<unknown> {
		return new Promise(resolve => {
			this.acquire(prioritize)
			.then(() => {
				(!(instructions instanceof Promise)
				? new Promise<unknown>(resolve => resolve(instructions()))
				: instructions)
                .then((result: unknown) => {
					this.acquireQueue.length
					? this.acquireQueue.shift()()
					: (this.isLocked = false);
					
					resolve(result);
				});
			});
		});
	}

}