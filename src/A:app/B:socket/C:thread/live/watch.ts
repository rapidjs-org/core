
import { argument } from "../../../../args";


const isLiveMode: boolean = argument("watch", "W").unary;


export function watch(dirPath: string, callback: () => void) {
	if(!isLiveMode) {
		return;
	}
    
	// TODO: Implement
}