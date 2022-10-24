import { AsyncMutex } from "../AsyncMutex";

// TODO: Implement on shared memory or rely on even distribution?

export class RateLimiter<T> {

    private readonly rateMutex: AsyncMutex = new AsyncMutex();
    private readonly limit: number;
    private readonly windowSize: number;

    private timePivot: number;
    private previousWindow: Map<T, number>;
    private currentWindow: Map<T, number> = new Map();

    constructor(limit: number, windowSize = 60000) {
        this.limit = limit;
        this.windowSize = windowSize;

        this.update();
    }

    private update() {
        this.rateMutex.lock(() => {
            this.timePivot = Date.now();

            this.previousWindow = this.currentWindow;
            this.currentWindow = new Map();
        }, true);
    }

    public grantsAccess(entityIdentifier: T): boolean {
        this.rateMutex.lock(() => {
            const currentHits: number = this.currentWindow.get(entityIdentifier) ?? 0;

            this.currentWindow.set(entityIdentifier, currentHits + 1);
        });

        const regsiteredHits = {
            previous: this.previousWindow.get(entityIdentifier) ?? 0,
            current: (this.currentWindow.get(entityIdentifier) ?? 0) + 1
        };

        const currentWindowWeight: number = (Date.now() - this.timePivot) / this.windowSize;
        const weightedHits: number = (regsiteredHits.previous * (1 - currentWindowWeight)) + (regsiteredHits.previous * currentWindowWeight);
        
        return (weightedHits <= this.limit);
    }

}

// Sliding window with peak adjustments?