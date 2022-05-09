
import { MODE } from "../../../mode";


export function watch(dirPath: string, callback: () => void) {
	if(!MODE.DEV) {
		return;
	}
	
}