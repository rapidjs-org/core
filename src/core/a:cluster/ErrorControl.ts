/**
 * Class representing an error control context which is to be fed
 * manually for terminating the current process on temporal error
 * bursts in order to prevent resource consumption of malicious
 * runtime contexts.
 * 
 */


const config = {
	errorLimit: 3,
	observationPeriod: 5000
};


import { argument } from "../argument";
import { print } from "../print";
import { MODE } from "../MODE";

	
export class ErrorControl {

    private readonly terminationMessage: string;
    private readonly observationPeriod: number;
    private readonly registrationLimit: number;

    private timeControl: number[] = [];

	/**
	 * @param {string} terminationMessage Message to display when error control terminates
	 * @param {Number} [observationPeriod] Error burst observation period (5s by default)
	 * @param {Number} [registrationLimit] Limit of error bursts (errors registered per observation period) upon which to terminate the process (3 by default)
	 */
    constructor(terminationMessage: string, observationPeriod: number = config.observationPeriod, registrationLimit?: number) {
    	this.terminationMessage = terminationMessage;
    	this.observationPeriod = observationPeriod;
    	this.registrationLimit = MODE.DEV ? 1 : (registrationLimit || config.errorLimit);
    }

	/**
	 * Feed error control with associated occurrence.
	 * Implicitly increments the error counter for the current observation period.
	 * TODO: Register error entities for registering repeated errors?
	 */
    feed() {
    	if(argument("disable-error-control").option) {
    		return;
    	}
        
    	const curTimestamp: number = Date.now();

    	this.timeControl = this.timeControl.filter((timestamp: number) => {
			return (curTimestamp <= (timestamp + this.observationPeriod));
		});
		
    	this.timeControl.push(curTimestamp);

    	if(this.timeControl.length < this.registrationLimit) {
    		return;
    	}

    	!MODE.DEV && this.terminationMessage
        && print.error(new RangeError(this.terminationMessage));
		
    	process.exit(1);
    }

}