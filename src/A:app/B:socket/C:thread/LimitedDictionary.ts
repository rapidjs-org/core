// TODO Replicate state among parallel instances?


export abstract class LimitedDictionary<L, D> {
    
    private readonly storage: Map<string, {
        limitReference: L,
        data: D
    }> = new Map();
    private readonly normalizationCallback: (key: string) => string;

    public readonly limit: L;

    constructor(limit?: L, normalizationCallback?: (key: string) => string) {
        this.limit = limit;
        
        this.normalizationCallback = normalizationCallback || ((key: string) => key);
    }

    protected get(key: string): D {
        return this.exists(key)
        ? this.storage.get(this.normalizationCallback(key)).data
        : undefined;
    }

    protected set(key: string, limitReference: L, data: D) {
        this.storage.set(this.normalizationCallback(key), {
            limitReference: limitReference,
            data: data
        });
    }

    protected abstract validateLimitReference(limitReference: L, key?: string): boolean;
    
    public exists(key: string): boolean {
        // TODO: Hit ratio tracking interface?
        
        const entry = this.storage.get(this.normalizationCallback(key));
        if(entry === undefined) {
            return false;
        }

        const result: boolean = this.validateLimitReference(entry.limitReference, key);
        if(!result) {
            this.storage.delete(key);
        }
        
        return result;
    }

    public abstract read(key: string): any;
    
    public abstract write(key: string, data: any): void;
    
}