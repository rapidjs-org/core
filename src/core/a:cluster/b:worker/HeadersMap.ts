/**
 * Class representing a map specified for use in HTTP request/response
 * headers organization. Extends map super class with automatic key
 * capitalized case conversion in order to work with case-insensitive
 * header name ambivalence.
 */


export class HeadersMap extends Map<string, string|string[]> {

	/**
	 * @param {Record<string, string|string[]>} [dictionaryRec] Single level key-value pair object for initial map derivation.
	 */
	constructor(dictionaryRec?: Record<string, string|string[]>) {
		super(Object.entries(dictionaryRec || {}));
	}

	/**
	 * Normalize a header name (map key).
	 * @param {string} name Header name
	 * @returns {string} Normalized header name
	 */
	private normalizeName(name: string): string {
		return `${name.charAt(0).toUpperCase()}${name.slice(1).replace(/-([a-z])/g, "-$1".toUpperCase())}`;
	}
	
	/**
	 * Whether the headers map contains a given header.
	 * @param {string} name Header name
	 * @returns {boolean} Header existence state
	 */
	public has(name: string): boolean {
		return super.has(this.normalizeName(name));
	}
	
	/**
	 * Get a specific header value from the map if exists.
	 * @param {string} name Header name
	 * @returns {string|string[]} Respective header value
	 */
	public get(name: string): string|string[] {
		return super.get(this.normalizeName(name));
	}

	/**
	 * Set a specific header to a given value.
	 * @param {string} name Header name
	 * @param {string|number|boolean|string[]} value Header value to set (implicit string conversion)
	 */
	public set(name: string, value: string|number|boolean|string[]): this {
		return super.set(this.normalizeName(name), value ? String(value) : undefined);
	}
	
}