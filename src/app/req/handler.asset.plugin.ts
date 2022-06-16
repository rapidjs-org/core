
import config from "../src.config.json";

import { readFileSync } from "fs";
import { join } from "path";

import { IResponse } from "../../core/core";

import { substituteMark } from "../util";
import { retireveClientModuleScript } from "../plugin/registry";

import { EStatus } from "./EStatus";


const appClientModuleText: string = substituteMark(readFileSync(join(__dirname, "./app.client.js")), "APP_IDENTIFIER", config.appIdentifier); // With configured websocket port (mark substitution)


/**
 * Handle a plug-in client module file (type 1) request.
 * @param {string} pathname Requested pathname
 * @param {core.IResponse} res Thread response object
 * @returns {core.IResponse} Modified thread response object
 */
export default function(pathname: string, res: IResponse): IResponse {
    // TODO: Plug-in combination pattern cache?
	const requestedPluginNames: Set<string> = new Set(pathname
    .slice(config.pluginRequestPrefix.length + 1)
    .split(new RegExp(`\\${config.pluginRequestSeparator}`, "g")));
    
	if(requestedPluginNames.size === 0) {
		res.status = EStatus.PRECONDITION_FAILED;

		return res;
	}
	
	// Always write core module text first if is requested (as of dependencies)
	let concatenatedModules = "";
	if(requestedPluginNames.delete(config.appClientModuleName)) {
		concatenatedModules += appClientModuleText;
	}

    // Concatenate scripts of all requested modules
	requestedPluginNames.forEach((name: string) => {
		const clientModuleScriptText: string = retireveClientModuleScript(name);    // TODO: Implement
		
		clientModuleScriptText
        ? concatenatedModules += `\n${clientModuleScriptText}`
        : res.status = EStatus.PARTIAL_INFORMATION; // Communicate partial information could not be retrieved
	});

     // Respond with not found status if no module has been located/read
	if(concatenatedModules.length === 0) {
		res.status = EStatus.NOT_FOUND;
		
		return res;
	}

	res.message = concatenatedModules;
    
    return res;
}