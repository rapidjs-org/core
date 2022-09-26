import { LimitDictionary } from "./LimitDictionary";


export class Cache<K, V> extends LimitDictionary<K, V, number> {

    private readonly duration: number;

    constructor(duration: number, normalizeKeyCallback?: (key: K) => K) { // TODO: Default from config
        super(() => {
            return Date.now();
        }, (_, limitReference: number) => {
            return ((Date.now() - limitReference) <= this.duration);
        }, normalizeKeyCallback);

        this.duration = duration;
    }

}