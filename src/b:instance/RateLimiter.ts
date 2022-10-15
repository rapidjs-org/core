import * as sharedMemory from "../shared-memory/shared-memory-api";
import { AsyncMutex } from "../AsyncMutex";


interface IWindow {
    timePivot: number,
    previous: number,
    current: number,
}


export class RateLimiter<T> {

    private static readonly keyPrefix: string = "RL:";

    private readonly rateMutex: AsyncMutex = new AsyncMutex();
    private readonly limit: number;
    private readonly windowSize: number;
    private readonly intermediateMemory: Map<T, IWindow> = new Map();

    constructor(limit: number, windowSize: number = 60000) {
        this.limit = limit;
        this.windowSize = windowSize;
    }

    private getInternalKey(entityIdentifier: T): string {
        return `${RateLimiter.keyPrefix}${entityIdentifier}`;   // Global rate memory among different objects (accumulatated effort)
    }

    private getWindowHits(entityIdentifier: T): IWindow {
        let window: IWindow;
        try {
            window = sharedMemory.readSync<IWindow>(this.getInternalKey(entityIdentifier));
        } catch {
            window = this.intermediateMemory.get(entityIdentifier);
        }
        window = window ?? {
            timePivot: Date.now(),
            previous: 0,
            current: 0
        };

        const timeDelta: number = Date.now() - window.timePivot;
        if(timeDelta <= this.windowSize) {
            return window;
        } else if(timeDelta <= (2 * this.windowSize)) {
            return {
                timePivot: window.timePivot + timeDelta,
                previous: 0,
                current: 0
            };
        } else {
            return {
                timePivot: Date.now(),
                previous: 0,
                current: 0
            };
        }
    }

    public grantsAccess(entityIdentifier: T): boolean {
        this.rateMutex.lock(() => {
            const window: IWindow = this.getWindowHits(entityIdentifier);

            window.current++;

            sharedMemory.write(this.getInternalKey(entityIdentifier), window);
        });

        const window: IWindow = this.getWindowHits(entityIdentifier);
        window.timePivot
        const currentWindowWeight: number = (Date.now() - window.timePivot) / this.windowSize;
        const weightedHits: number = (window.previous * (1 - currentWindowWeight)) + (window.previous * currentWindowWeight);
        
        return (weightedHits <= this.limit);
    }

}

// Sliding window with peak adjustments?