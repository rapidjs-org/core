
const config = {
	...require("../../../app.config.json"),

	defaultEndpointName: "::default",
	pluginConfigIdentifier: "pluginConfig",
	clientModuleAppName: "rapidJS",
	clientModuleReferenceName: {
		shared: "SHARED",
		public: "PUBLIC"
	},
	pluginNameRegex: /(@[a-z0-9+-][*a-z0-9._-]*\/)?[a-z0-9+-][a-z0-9._-]*/,
	pluginNameSeparator: "+",
	pluginRequestPrefix: "plug-in::",
	thisRetainerIdentifier: "$this"
};


import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";

import { print } from "../../../../print";

import { PLUGIN_CONFIG } from "../../../config/config.plugins";
import * as commonInterface from "../../../interface.common";

import { Status } from "../../Status";

import { Cache } from "../../../Cache";
import { MutualError } from "../../../MutualError";

import { retrieveRequestInfo } from "../request-info";


const interfaceModulePath: string = require.resolve("./interface.plugin");

const activePluginRegistry = {
	dict: new Map<string, {
        integrateManually: boolean;
        moduleDirPath: string;
		muteEndpoints: boolean;
		muteRendering: boolean;

        clientModuleText?: string;
        compoundOnly?: boolean;
		endpoints?: Map<string, {
			handler: TEndpointHandler;
			useCache: boolean;
		}>;
	}>(),
	genericIntegrationList: {
		any: new Set<string>(),
		compoundOnly: new Set<string>()
	}
};


function evalPlugin(name: string, moduleDirPath: string) {
	// Empty module cache (for eventual re-evaluation; live behavior in DEV MODE)
	if(require.cache[moduleDirPath]) {
		delete require.cache[moduleDirPath];
	}

	const Module = require("module");   // for runtime dynamic module wrapping
    
	// Temporarily manipulate wrapper in order to inject this assignment (representing the plugin interface)
	const _wrap = Module.wrap;

	// Require custom wrapped module (providing the plugin interface to the module context)
	let pluginModule;
	try {
		// const console = {
		//     log: message => {
		//         require("${require.resolve("../../utilities/output")}").log(message, "${name}")
		//     },
		//     error: err => {
		//         require("${require.resolve("../../utilities/output")}").error(err, false, "${name}");
		//     }
		// };
		Module.wrap = (_exports => {
			return `${Module.wrapper[0]}
            const interface = require("${interfaceModulePath}");
                for(const prop in interface) {
                    this[prop] = (...args) => {
                        interface[prop]("${name}", ...args);
                    };
                }
                
                this.${config.pluginConfigIdentifier} = ${JSON.stringify(PLUGIN_CONFIG)};
				
                const ${config.thisRetainerIdentifier} = this;
            ${_exports}${Module.wrapper[1]}`;
		});

		pluginModule = require.main.require(moduleDirPath);	// Require using the modified module wrapper
	} catch(err) {
		Module.wrap = _wrap;

		throw err;
	}
    
	Module.wrap = _wrap;

	// TODO: Option for muting output of threads except one to remove duplicates (static context)?

	if(!(pluginModule instanceof Function)) {
		// Static plugin module (not receiving the common interface object)
		return;
	}

	// Dynamic plugin module getting passed the common interface object
	pluginModule(commonInterface);
}


export function registerActivePlugin(plugin: IPassivePlugin) {
	activePluginRegistry.dict.set(plugin.name, {
		integrateManually: plugin.options.integrateManually,
		moduleDirPath: dirname(plugin.modulePath),
		muteEndpoints: plugin.options.muteEndpoints,
		muteRendering: plugin.options.muteRendering,
	});
    
	try {
		evalPlugin(plugin.name, plugin.modulePath);
	} catch(err) {
		print.info(`An error occurred within the '${plugin.name}' plug-in module`);
		print.error(err);
	}
}

export function retireveClientModuleScript(pluginName: string): string {
	return (activePluginRegistry.dict.get(pluginName) || {}).clientModuleText;
}

export function retrieveIntegrationPluginNames(isCompound: boolean): Set<string> {
	return isCompound
		? new Set([...activePluginRegistry.genericIntegrationList.any, ...activePluginRegistry.genericIntegrationList.compoundOnly])
		: activePluginRegistry.genericIntegrationList.any;
}


// PLIUG-IN INTERFACE

const endpointCache: Cache<unknown> = new Cache();

export function bindClientModule(associatedPluginName: string, relativePath: string, sharedProperties?: TObject, compoundOnly?: boolean) {
	// TODO: Swap shared and compound argument as of usage frequency (keep backwards compatibility with type check augmented overload)

	const pluginObj = activePluginRegistry.dict.get(associatedPluginName);

	// Construct path to plugin client script file
	const clientModuleFilePath: string = join(pluginObj.moduleDirPath, relativePath).replace(/(\.js)?$/, ".js");

	// Read client module file
	if(!existsSync(clientModuleFilePath)) {
		throw new ReferenceError(`Client module file of plugin '${associatedPluginName}' not found at  '${clientModuleFilePath}'`);
	}
	const bareClientScript = String(readFileSync(clientModuleFilePath));

	// Construct individual script module
	const modularClientScript: string[] = [`
        ${config.clientModuleAppName}["${associatedPluginName}"] = (_ => {
            const ${config.thisRetainerIdentifier} = {
                endpoint: (body, options = {}) => {
                    return ${config.clientModuleAppName}.${config.coreIdentifier}.mediateEndpoint("${associatedPluginName}", body, options.name, options.progressHandler);
				},
				
                ${config.clientModuleReferenceName.public}: {},
                ${config.clientModuleReferenceName.shared}: ${JSON.stringify(sharedProperties)}
            };
			
            for(const member in ${config.thisRetainerIdentifier}) {
                this[member] = ${config.thisRetainerIdentifier}[member]
            }
            
			`,`

            return ${config.thisRetainerIdentifier}.${config.clientModuleReferenceName.public};
        })();
    `].map(part => {
		// Minifiy wrapper
		return part
			.replace(/([{};,])\s+/g, "$1")
			.trim();
	});

	// Register client module in order to be integrated into pages upon request
	pluginObj.clientModuleText = `${modularClientScript[0]}${bareClientScript}${(bareClientScript.slice(-1) != ";") ? ";" : ""}${modularClientScript[1]}`;
	pluginObj.compoundOnly = compoundOnly;
	pluginObj.endpoints = new Map();
	
	activePluginRegistry.dict.set(associatedPluginName, pluginObj);

	// Manipulate generic integration set according to integration option
	activePluginRegistry.genericIntegrationList
		.compoundOnly[(!pluginObj.integrateManually && compoundOnly) ? "add" : "delete"](associatedPluginName);
	activePluginRegistry.genericIntegrationList
		.any[(!pluginObj.integrateManually && !compoundOnly) ? "add" : "delete"](associatedPluginName);
}

export function defineEndpoint(associatedPluginName: string, endpointHandler: TEndpointHandler, options: TObject) {
	const pluginObj = activePluginRegistry.dict.get(associatedPluginName);

	if(pluginObj.muteEndpoints) {
		return;
	}

	if(!(endpointHandler instanceof Function) && typeof(endpointHandler) !== "function") {
		throw new SyntaxError(`Given endpoint handler argument of type ${typeof(endpointHandler)}, expecting Function`);
	}

	pluginObj.endpoints.set(options.name || config.defaultEndpointName, {
		handler: endpointHandler,
		useCache: !!options.useCache
	});

	activePluginRegistry.dict.set(associatedPluginName, pluginObj);
}

export function activateEndpoint(associatedPluginName: string, requestBody?: TObject, endpointName?: string): IEndpointHandlerResult {
	endpointName = endpointName || config.defaultEndpointName;
	
	const endpoint = activePluginRegistry.dict.get(associatedPluginName).endpoints.get(endpointName);

	if(!endpoint) {
		return null;
	}

	const cacheKey = `${associatedPluginName}+${endpointName}`;	// Plug-in / endpoint unique key due to name distinctive concatenation symbol

	let handlerData: unknown;
	if(endpoint.useCache
	&& endpointCache.has(cacheKey)) {
		return {
			status: Status.SUCCESS,
			data: endpointCache.read(cacheKey)
		};
	} else {
		try {
			handlerData = endpoint.handler(requestBody, retrieveRequestInfo());
		} catch(err) {
			if(err instanceof MutualError) {
				return {
					status: err.status,
					data: err.message
				};
			}

			throw err;
		}
	}

	endpoint.useCache && endpointCache.write(cacheKey, handlerData);

	return {
		status: Status.SUCCESS,
		data: handlerData
	};
}