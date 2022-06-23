

import config from "../src.config.json";

import { print, Cache } from "../../core/core";

import { IEndpointHandlerResult } from "../interfaces";
import { EStatus } from "../req/EStatus";
import { retrieveEntityInfo } from "../entity";

import { TEndpointHandler } from "./types";
import { activePluginRegistry } from "./registry";


interface IEndpointOptions {
    name?: string;
	cacheable?: boolean;
}


const endpointCache: Cache<unknown> = new Cache();


export function defineEndpoint(associatedPluginName: string, endpointHandler: TEndpointHandler, options: IEndpointOptions = {}) {
	const pluginObj = activePluginRegistry.get(associatedPluginName);

	if(pluginObj.muteEndpoints) {
		return;
	}

	if(!(endpointHandler instanceof Function) && typeof(endpointHandler) !== "function") {
		throw new SyntaxError(`Given endpoint handler argument of type ${typeof(endpointHandler)}, expecting Function`);
	}

	pluginObj.endpoints.set(options.name || config.defaultEndpointName, {
		handler: endpointHandler,
		cacheable: !!options.cacheable
	});

	activePluginRegistry.set(associatedPluginName, pluginObj);
}

export function activateEndpoint(associatedPluginName: string, requestBody?: TObject, endpointName?: string): IEndpointHandlerResult|number {
	const pluginObj = activePluginRegistry.get(associatedPluginName);
    
	if(!pluginObj) {
		print.debug(`Endpoint request of undefined plug-in '${associatedPluginName}'`);

		return EStatus.NOT_FOUND;
	}

	const endpoint = pluginObj.endpoints.get(endpointName || config.defaultEndpointName);

	if(!endpoint) {
		print.debug(`Undefined ${endpointName ? `'${endpointName}'` : "default"} endpoint request of plug-in '${associatedPluginName}'`);

		return EStatus.NOT_FOUND;
	}

	const cacheKey = `${associatedPluginName}+${endpointName || ""}`;	// Plug-in / endpoint unique key due to name distinctive concatenation symbol

	let handlerData: unknown;
	if(endpoint.cacheable
	&& endpointCache.has(cacheKey)) {
		return {
			status: EStatus.SUCCESS,
			data: endpointCache.read(cacheKey)
		};
	}
	
	handlerData = endpoint.handler(requestBody, retrieveEntityInfo());

	endpoint.cacheable
	&& endpointCache.write(cacheKey, handlerData);

	return {
		status: EStatus.SUCCESS,
		data: handlerData
	};
}