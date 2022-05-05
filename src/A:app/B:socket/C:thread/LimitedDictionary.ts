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
	
    protected hasEntry(key: string): boolean {
    	// TODO: Hit ratio tracking interface?
    	// TODO: Keep in storage for a while after successful check up as immediate expiration afterwards might cause undesired bahvior?
        
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

    protected getEntry(key: string): D {
    	return this.hasEntry(key)
    		? this.storage.get(this.normalizationCallback(key)).data
    		: undefined;
    }

    protected setEntry(key: string, limitReference: L, data: D) {
    	this.storage.set(this.normalizationCallback(key), {
    		limitReference: limitReference,
    		data: data
    	});
    }

    protected abstract validateLimitReference(limitReference: L, key?: string): boolean;

    public abstract read(key: string): unknown;
    
    public abstract write(key: string, data: unknown): unknown;
    
}