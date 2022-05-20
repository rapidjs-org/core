
import { argument } from "../args";
import { print } from "../print";

import { MODE } from "./MODE";


const errorControlDisabled: boolean = argument("disable-error-control").unary;


export class ErrorControl {

    private readonly timeControl: number[] = [];
    private readonly terminationMessage: string;
    private readonly observationPeriod: number;
    private readonly registrationLimit: number;

    constructor(terminationMessage: string, observationPeriod = 5000, registrationLimit?: number) {
    	this.terminationMessage = terminationMessage;
    	this.observationPeriod = observationPeriod;
    	this.registrationLimit = MODE.DEV ? 1 : (registrationLimit || 3);
    }

    feed() {
    	if(errorControlDisabled) {
    		return;
    	}
        
    	const curTimestamp: number = Date.now();
        
    	while(curTimestamp > ((this.timeControl[0] || Infinity) + this.observationPeriod)) {
    		this.timeControl.shift();
    	}

    	this.timeControl.push(curTimestamp);
        
    	if(this.timeControl.length < this.registrationLimit) {
    		return;
    	}

    	!MODE.DEV && this.terminationMessage
        && print.error(new RangeError(this.terminationMessage));

    	process.exit(1);
    }

}