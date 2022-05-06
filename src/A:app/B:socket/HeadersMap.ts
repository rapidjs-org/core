
export class HeadersMap extends Map<string, string> {

	constructor(dictionaryRec?: Record<string, string>) {
		super(Object.entries(dictionaryRec || {}));
	}

	public get(name: string): string {
		return super.get(name.toLowerCase());
	}

	public set(name: string, value: string|number|boolean) {
		super.set(name.toLowerCase(), String(value));

		return null;
	}

}