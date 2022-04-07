// TODO Replicate state among parallel instances?

import { MODE } from "../../mode";
import { PROJECT_CONFIG } from "../../config/config.project";


export class Cache<T> {
    private readonly storage: Map<string, {
        timestamp: number,
        data: T
    }> = new Map();
    private readonly duration: number;
    private readonly normalizationCallback: (key: string) => string;

    constructor(duration?: number, normalizationCallback?: (key: string) => string) {
        this.duration = MODE.PROD
        ? duration || PROJECT_CONFIG.read("cachingDuration", "server").number
        : Infinity;

        this.normalizationCallback = normalizationCallback || ((key: string) => key);
    }

    public exists(key: string) {
        key = this.normalizationCallback(key);

        const entry = this.storage.get(key);
        
        if(entry === undefined
        || (entry.timestamp + this.duration) < Date.now()) {
    		this.storage.delete(key);
            
    		return false;
    	}

        return true;
    }

    public read(key: string) {
        return this.exists(key)
        ? this.storage.get(this.normalizationCallback(key))
        : undefined;
    }

    public write(key: string, data: T) {
        this.storage.set(this.normalizationCallback(key), {
            timestamp: Date.now(),
            data: data
        });
    }
}