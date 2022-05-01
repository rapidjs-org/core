
import { bindClientModule } from "./plugin";


namespace Interface {

    export let associatedPluginName: string;

    export function clientModule(relativePathToModule: string, sharedProperties: Record<string, any> = {}, compoundOnly = false) {
    	console.log(associatedPluginName);
    	bindClientModule(relativePathToModule, sharedProperties, compoundOnly);
    }

    export function endpoint(callback: (body: Record<string, any>, req: IRequestInfo) => any, useCache = false) {

    }

    export function namedEndpoint(name: string, callback: (body: Record<string, any>, req: IRequestInfo) => any, useCache = false) {
    	if(name.length == 0) {
    		throw new SyntaxError("Endpoint name must not be empty");
    	}
    }

}


export function prepare(pluginName: string) {
	console.log(pluginName);
	Interface.associatedPluginName = pluginName;
    
	return Interface;
}