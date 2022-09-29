import * as sharedMemory from "../shared-memory/shared-memory-api";


interface ILimitEntry<V, L> {
    value: V;
    limitReference: L;
}


export abstract class LimitDictionary<K, V, L> {
    
    private static instances: number = 0;

    private readonly id: number;
    private readonly intermediateMemory: Map<K, ILimitEntry<V, L>> = new Map();
    private readonly normalizeKeyCallback: (key: K) => K;

    private existenceLookupValue: {
        key: K;
        value: V;
        timestamp: number;
    };

    constructor(normalizeKeyCallback?: (key: K) => K) {
        this.normalizeKeyCallback = normalizeKeyCallback || (k => k);   // Identity by default
        
        this.id = LimitDictionary.instances++;
    }

    protected abstract retrieveReferenceCallback(key: K): L;
    protected abstract validateLimitCallback(reference: L, current: L): boolean;

    private getInternalKey(key: K): string {
        return `${this.id}${this.normalizeKeyCallback(key).toString()}`;
    }

    protected setExistenceLookup(key: K, value: V) {
        this.existenceLookupValue = {
            key: this.normalizeKeyCallback(key),
            value: value,
            timestamp: Date.now()
        };
    }

    public write(key: K, value: V): Promise<void> {
        const entry: ILimitEntry<V, L> = {
            value: value,
            limitReference: this.retrieveReferenceCallback(key)
        };
        
        // TODO: Benchmark w and w/o enabled top layer intermediate memory (-> Dict <-> intermediate <-> SHM)

        // TODO: Note values are serialized (JSON.stringify() in order to be stored in SHM)
        const serializedData: string = JSON.stringify(entry);
        
        return new Promise(resolve => {
            sharedMemory.write(this.getInternalKey(key), serializedData)   // TODO: Note key is stringified implicitly (requires unambiguos serialization)
            .catch(() => {
                this.intermediateMemory.set(key, entry);
            })
            .finally(() => {
                resolve();
            })
        });
    }

    public read(key: K): V {
        // TODO: Implement intermediate

        if((this.existenceLookupValue || {}).key !== this.normalizeKeyCallback(key)
        || (Date.now() - ((this.existenceLookupValue || {}).timestamp || 0)) > 1000) {    // TODO: Define timeout threshold (from config?)
            const exists: boolean = this.exists(key);

            if(!exists) {
                return null;
            }
        }
        
        const retrievedValue: V = this.existenceLookupValue.value;
        
        this.existenceLookupValue = null;
        
        return retrievedValue;  
    }   // Async interface { read, readSync } ?

    public exists(key: K): boolean {
        // TODO: Implement intermediate

        const serializedData: string = sharedMemory.read(this.getInternalKey(key).toString());

        if(!serializedData) {
            return false;
        }
        
        const dynamicData: ILimitEntry<V, L> = JSON.parse(serializedData);

        let reference: L;
        try {
            reference = this.retrieveReferenceCallback(key);
        } catch {
            return false;
        }
        
        if(!this.validateLimitCallback(dynamicData.limitReference, reference)) {
            return false;
        }
        
        this.setExistenceLookup(key, dynamicData.value);

        return true;
    }

}