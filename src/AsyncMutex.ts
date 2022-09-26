export class AsyncMutex {

	private readonly acquireQueue: ((value?: unknown) => void)[] = [];

	private isLocked: boolean = false;

	private acquire() {
		if(!this.isLocked) {
			this.isLocked = true;

			return Promise.resolve();
		}

		return new Promise(resolve => {
			this.acquireQueue.push(resolve);
		});
	}

	public async lock(instructions: (() => void)|Promise<unknown>): Promise<unknown> {
		return new Promise(resolve => {
			this.acquire().then(() => {
				(!(instructions instanceof Promise)
				? new Promise<unknown>(resolve => {
                    const result: unknown = (instructions as (() => void))();

                    resolve(result);
                })
				: instructions)
                .then((result: unknown) => {
					(this.acquireQueue.length > 0)
						? this.acquireQueue.shift()()
						: (this.isLocked = false);
					
					resolve(result);
				});
			});
		});
	}

}