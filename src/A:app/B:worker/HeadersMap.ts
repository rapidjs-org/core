
export class HeadersMap extends Map<string, string> implements HeadersMap {

	constructor(dictionaryRec?: Record<string, string>) {
		super(Object.entries(dictionaryRec || {}));
	}

	private normalizeName(name: string): string {
		return `${name.charAt(0).toUpperCase()}${name.slice(1).replace(/-([a-z])/g, "-$1".toUpperCase())}`;
	}
	
	public has(name: string): boolean {
		return super.has(this.normalizeName(name));
	}
	
	public get(name: string): string {
		return super.get(this.normalizeName(name));
	}

	public set(name: string, value: string|number|boolean) {
		return super.set(this.normalizeName(name), value ? String(value) : undefined);
	}
	
}