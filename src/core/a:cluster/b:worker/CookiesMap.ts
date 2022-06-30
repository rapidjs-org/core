/**
 * Class representing a cookie set for response.
 */


import { IS_SECURE } from "../../IS_SECURE";


interface ICookie {
    value: string;
    
    maxAge?: number;    // TODO: Date?
}


export class CookiesMap {

	public readonly cookiesMap: Map<string, ICookie>;

	static from(obj: {
		cookiesMap?: Map<string, ICookie>;
	}) {
		return new CookiesMap((obj.cookiesMap));
	}
	
	constructor(cookiesMap?: Map<string, ICookie>) {
		this.cookiesMap = cookiesMap || new Map();
	}

	/**
	 * Set a cookie for response.
	 * @param {string} name Cookie name
	 * @param {*} Cookie value (will be serialized)
	 * @param {number} maxAge Cookie lifetime from now (existence duration)
	 */
	public set(name: string, value: unknown, maxAge?: number) {
		this.cookiesMap.set(name, {
			value: String(value),

			maxAge: maxAge
		});
	}

	/**
	 * Concatenate cookie data to header representation for response.
	 * @returns {string} Concatenated cookies header value
	 */
	public stringify(): string {
		const cookiesArray: string[] = [];

		this.cookiesMap.forEach((cookie: ICookie, name: string) => {
			// TODO:  ; path=${} ?
			cookiesArray.push(`${name}=${cookie.value}; ${cookie.maxAge ? `; Max-Age=${cookie.maxAge}` : ""}${IS_SECURE ? "; SameSite=Strict; Secure; HttpOnly" : ""}`);
		});

		return (cookiesArray.length > 0) ? cookiesArray.join() : null;
	}
	
}