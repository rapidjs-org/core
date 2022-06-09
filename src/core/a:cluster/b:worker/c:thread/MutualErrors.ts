/**
 * Classes representing individual response error entities for
 * closing a request irregularly but with a custom status code
 * and optionally message.
 * Instance to be thrown in a request handler (sub-)module for
 * provocing a respective response.
 */


// TODO: RedirectError?
// TODO: Mutual error to be caught on top level of req handler for genric response routine?


export abstract class MutualError extends Error {

    public status: number;

    /**
	 * @param {number} leadingDigit Status code range / type indicator (leading digit (any; allows custom type ranges))
	 * @param {number|EStatus} status Status code or alias from related the enum
	 * 								  (must be within bounds of the defined error code range (<leadingDigit>**); validator)
	 * @param {string} message Optional status related message considerable for response enrichment
	 */
    constructor(leadingDigit: number, status: number, message?: string) {
    	super(message);

    	const offset: number = leadingDigit * 100;
		
    	if(!Number.isInteger(status)
           || status < offset
           || status > (offset + 99)) {
    		throw new RangeError(`Invalid error status code thrown '${status}' [${offset}, ${offset + 99}]`);
    	}

    	this.status = status;
    }
	
}


export class MutualClientError extends MutualError {

	constructor(status: number, message?: string) {
		super(4, status, message);	// 4**
	}

}

export class MutualServerError extends MutualError {
	
	constructor(status: number, message?: string) {
		super(5, status, message);	// 5**
	}

}