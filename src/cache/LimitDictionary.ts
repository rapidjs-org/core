import * as sharedMemory from "../shared-memory/shared-memory-api";


interface ILimitEntry<V, L> {
    value: V;
    limitReference: L;
}


export abstract class LimitDictionary<K, V, L> {
    
    private static instances: number = 0;

    private readonly id: number;
    private readonly intermediateMemory: Map<K, ILimitEntry<V, L>> = new Map();
    private readonly limitReferenceCallback: (key: K) => L;
    private readonly limitValidatorCallback: (key: K, limitReference: L) => boolean;
    private readonly normalizeKeyCallback: (key: K) => K;

    private lastExistenceLookupValue: {
        key: K;
        value: V;
    };

    constructor(limitReferenceCallback: (key: K) => L, limitValidatorCallback: (key: K, limitReference: L) => boolean, normalizeKeyCallback?: (key: K) => K) {
        this.limitReferenceCallback = limitReferenceCallback;
        this.limitValidatorCallback = limitValidatorCallback;
        this.normalizeKeyCallback = normalizeKeyCallback || (k => k);   // Identity function by default
        
        this.id = LimitDictionary.instances++;
    }

    private getInternalKey(key: K): string {
        return `${this.id}${this.normalizeKeyCallback(key).toString()}`;
    }

    public write(key: K, value: V): Promise<void> {
        const entry: ILimitEntry<V, L> = {
            value: value,
            limitReference: this.limitReferenceCallback(key)
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

        if((this.lastExistenceLookupValue || {}).key !== key) { // TODO: Check for outdating (eventual insufficience) / Require immediate read after existence check?
            const exists: boolean = this.exists(key);

            if(!exists) {
                return null;
            }
        }
        
        const retrievedValue: V = this.lastExistenceLookupValue.value;
        
        this.lastExistenceLookupValue = null;

        return retrievedValue;  
    }   // Async interface { read, readSync } ?

    public exists(key: K): boolean {
        // TODO: Implement intermediate
        
        const serializedData: string = sharedMemory.read(this.getInternalKey(key).toString());

        if(!serializedData) {
            return false;
        }
        
        const dynamicData: ILimitEntry<V, L> = JSON.parse(serializedData);
        
        if(!this.limitValidatorCallback(key, dynamicData.limitReference)) {
            return false;
        }
        
        this.lastExistenceLookupValue = {
            key: key,
            value: dynamicData.value
        };

        return true;
    }

}