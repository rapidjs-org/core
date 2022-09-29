import { LimitDictionary } from "./LimitDictionary";


export class Cache<K, V> extends LimitDictionary<K, V, number> {

    private readonly duration: number;

    constructor(duration: number, normalizeKeyCallback?: (key: K) => K) { // TODO: Default from config
        super(normalizeKeyCallback);
        
        this.duration = duration;
    }

    protected retrieveReferenceCallback(): number {
        return Date.now();
    }

    protected validateLimitCallback(reference: number, current: number): boolean {
        return ((current - reference) <= this.duration);
    }

}