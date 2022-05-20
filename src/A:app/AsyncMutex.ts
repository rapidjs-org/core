
type TEmptyResolve = (value?: unknown) => void;


export class AsyncMutex {

	private readonly acquireQueue: TEmptyResolve[] = [];

	private isLocked: boolean;

	private acquire() {
		if(!this.isLocked) {
			this.isLocked = true;

			return Promise.resolve();
		}

		return new Promise(resolve => {
			this.acquireQueue.push(resolve);
		});
	}

	public lock(callback: () => void) {
		this.acquire().then(() => {
			callback();

			(this.acquireQueue.length > 0)
				? this.acquireQueue.shift()()
				: (this.isLocked = false);
		});
	}

}