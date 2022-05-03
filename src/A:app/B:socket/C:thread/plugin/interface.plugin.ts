
import { bindClientModule } from "./registry";


export function clientModule(associatedPluginName: string, relativePathToModule: string, sharedProperties: TObject = {}, compoundOnly = false) {
	bindClientModule(associatedPluginName, relativePathToModule, sharedProperties, compoundOnly);
}

export function endpoint(callback: (body: TObject, req: IRequestInfo) => unknown, useCache = false) {

}

export function namedEndpoint(name: string, callback: (body: TObject, req: IRequestInfo) => unknown, useCache = false) {
	if(name.length == 0) {
		throw new SyntaxError("Endpoint name must not be empty");
	}
}