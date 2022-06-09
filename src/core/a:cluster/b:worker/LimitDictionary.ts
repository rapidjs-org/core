/**
 * Abstract class representing a dicitionary with entry existence limited
 * based on a concrete reference value and validation scheme.
 * Can be utilized e.g. for temporal, file stamp or data hash limited storages.
 */


// TODO: Utilize shared memory! Have process local intermediate cache to reduce mem read?
// TODO: Memeory usage control and clean up / garbage collection on high consumption?


export abstract class LimitDictionary<L, V> {
    
    private readonly storage: Map<string, {
        limitReference: L,
        value: V
    }> = new Map();
    private readonly normalizationCallback: (key: string) => string;
	
    protected readonly limitDelta: L;

	/**
	 * @param {L} limitDelta Limit delta for limit reference validation
	 * @param {Function} [normalizationCallback] Key normalization callback (for unifying ambivalent key name spaces)
	 */
    constructor(limitDelta?: L, normalizationCallback?: (key: string) => string) {
    	this.limitDelta = limitDelta;
		
    	this.normalizationCallback = normalizationCallback || ((key: string) => key);
    }
	
	/**
	 * Update a value associated to a given key without changing the limit reference.
	 * @param {L} limitReference Entry limit reference
	 * @param {V} value Entry value
	 */
    protected update(key: string, value: V) {
    	key = this.normalizationCallback(key);

    	const currentLimitReference: L = this.storage.get(key).limitReference;

    	this.storage.set(key, {
    		limitReference: currentLimitReference,
    		value: value
    	});
    }

	/**
	 * Whether the dictionary has stored a valid value for a given key (existing and not exceeding limit).
	 * @param {string} key Key name
	 * @returns {boolean} Associated value
	 */
	 public has(key: string): boolean {
    	// TODO: Hit ratio tracking interface?
    	// TODO: Keep in storage for a while after successful check up as immediate expiration afterwards might cause undesired bahvior?
        
    	const entry = this.storage.get(this.normalizationCallback(key));
    	if(entry === undefined) {
    		return false;
    	}

    	const result: boolean = this.validateLimitReference(entry.limitReference, key);
    	!result && this.storage.delete(key);
        
    	return result;
    }
	
	/**
	 * Get the value associated with a given key (iff dictionary has entry).
	 * validity check performed implicitly. 
	 * @param {string} key Entry key name
	 * @returns {V} Associated entry value
	 */
	 public read(key: string): V {
    	return this.has(key)
    		? this.storage.get(this.normalizationCallback(key)).value
    		: undefined;
    }
	
	/**
	 * Set a value associated with a given key and limit reference.
	 * @param {string} key Entry key name
	 * @param {V} value Entry value
	 * @param {L} [limitReference] Entry limit reference
	 */
    public write(key: string, value: V, limitReference?: L) {
    	this.storage.set(this.normalizationCallback(key), {
    		limitReference: limitReference,
    		value: value
    	});
    }

	/**
	 * Validate a given limit reference against the limit delta.
	 * @abstract
	 * @param {L} limitReference Entry limit reference
	 * @param {V} key Entry key (optionally use for reference value retrieval)
	 * @returns {boolean} Whether the referenc eis within limit delta bounds (is valid)
	 */
    protected abstract validateLimitReference(limitReference: L, key?: string): boolean;
    
}