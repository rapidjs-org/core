
import { bindClientModule, defineEndpoint } from "./registry";


export function clientModule(associatedPluginName: string, relativePathToModule: string, sharedProperties: TObject = {}, compoundOnly = false) {
	bindClientModule(associatedPluginName, relativePathToModule, sharedProperties, compoundOnly);
}

export function readSupportFile(associatedPluginName: string, name: string): string {
	return "";
}

export function endpoint(associatedPluginName: string, endpointHandler: TEndpointHandler, options: {
	name?: string;
	useCache?: boolean;
} = {}) {
	defineEndpoint(associatedPluginName, endpointHandler, options);
}