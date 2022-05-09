
export class HeadersMap extends Map<string, string> implements HeadersMap {

	constructor(dictionaryRec?: Record<string, string>) {
		super(Object.entries(dictionaryRec || {}));
	}
	
	public has(name: string): boolean {
		console.log(name);
		return super.has(name.toLowerCase());
	}
	
	public get(name: string): string {
		return super.get(name.toLowerCase());
	}

	public set(name: string, value: string|number|boolean) {
		return super.set(name.toLowerCase(), String(value));
	}
	
}