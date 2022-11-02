import { parseFlag } from "./args";
import { MODE } from "./MODE";


const errorControlDisabled: boolean = parseFlag("disable-error-control");


export class ErrorControl {

    private readonly errorCallback: () => void;
    private readonly periodSize: number;
    private readonly limit: number;
	
    private timeControl: number[] = [];

    constructor(errorCallback: () => void, periodSize: number = 5000, limit: number = 3) {
    	this.errorCallback = errorCallback;
    	this.periodSize = periodSize;
    	this.limit = limit;
    }

    feed() {
		if(errorControlDisabled || MODE.DEV) {
			return;
		}

    	const curTimestamp: number = Date.now();

    	this.timeControl = this.timeControl
		.filter((timestamp: number) => {
			return (curTimestamp <= (timestamp + this.periodSize));
		});
		
    	this.timeControl.push(curTimestamp);

    	if(this.timeControl.length <= this.limit) {
    		return;
    	}
		
    	setImmediate(() => this.errorCallback());
    }

}