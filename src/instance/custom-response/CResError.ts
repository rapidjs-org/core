/**
 * Class representing an individual response error for closing a request irregularly.
 * Instance to be thrown for a respective response.
 */


// TODO: RedirectError?

export abstract class ResError extends Error {
    public status: number;

    /**
	 * @param {number} leadingDigit Status code range (leading digit for type)
	 * @param {number} status Status code (within error code range (<leadingDigit>**))
	 * @param {string} message Optional description message
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