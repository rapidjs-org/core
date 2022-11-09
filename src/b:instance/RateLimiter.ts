import { AsyncMutex } from "../AsyncMutex";

// TODO: Assuming even distribution, limit is n * configured_limit; implement hash based distribution for n consistency?


type TRate<T> = Map<T, number>;


export class RateLimiter<T> {

    private readonly rateMutex: AsyncMutex = new AsyncMutex();
    private readonly limit: number;
    private readonly windowSize: number;

    private timePivot: number;
    private previousWindow: TRate<T>;
    private currentWindow: TRate<T> = new Map();

    constructor(limit: number, windowSize = 60000) {
        this.limit = limit;
        this.windowSize = windowSize;

        this.shift();

        this.timePivot -= windowSize;

        setInterval(() => this.updateWindows(), windowSize);
    }

    private shift() {
        this.timePivot = Date.now();
            
        this.previousWindow = this.currentWindow;
        this.currentWindow = new Map();
    }

    private updateWindows() {
        this.rateMutex.lock(() => this.shift(), true);
    }

    public grantsAccess(entityIdentifier: T): boolean {
        const currentHits: number = (this.currentWindow.get(entityIdentifier) ?? 0) + 1;
                
        this.currentWindow.set(entityIdentifier, currentHits);

        const currentWindowWeight: number = Math.min((Date.now() - this.timePivot) / this.windowSize, 1);
        const weightedHits: number = ((this.previousWindow.get(entityIdentifier) ?? 0) * (1 - currentWindowWeight)) + (currentHits * currentWindowWeight);
        
        return (weightedHits <= this.limit);
    }
}

// Sliding window with peak adjustments?