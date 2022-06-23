

import config from "../src.config.json";

import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

import { Config, print } from "../../core/core";

import * as commonInterface from "../api/api.common";
import { TEndpointHandler } from "./TEndpointHandler";


// TODO: Refactor and optimize plug-in modularity


const apiModulePath: string = require.resolve("../api/api.plugin");


const genericIntegrationList = {
	any: new Set<string>(),
	compoundOnly: new Set<string>()
};

export const activePluginRegistry = new Map<string, {
	integrateManually: boolean;
	moduleDirPath: string;
	muteEndpoints: boolean;
	muteRendering: boolean;

	clientModuleText?: string;
	compoundOnly?: boolean;
	endpoints?: Map<string, {
		handler: TEndpointHandler;
		cacheable: boolean;
	}>
}>();


function requirePluginModule(name: string, modulePath: string) {
	// Empty module cache (for eventual re-evaluation; live behavior in DEV MODE)
	if(require.cache[modulePath]) {
		delete require.cache[modulePath];
	}

	const Module = require("module");   // for runtime dynamic module wrapping
    
	// Temporarily manipulate wrapper in order to inject this assignment (representing the plugin interface)
	const _wrap = Module.wrap;

	// Require custom wrapped module (providing the plug-in interface to the module context)
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
            const interface = require("${apiModulePath}");
                for(const prop in interface) {
                    this[prop] = (...args) => {
                        interface[prop]("${name}", ...args);
                    };
                }
                
                this.${config.pluginConfigIdentifier} = ${JSON.stringify(Config["plugins"].toObject())};
				
                const ${config.thisRetainerIdentifier} = this;
            ${_exports}${Module.wrapper[1]}`;
		});

		pluginModule = require.main.require(modulePath);	// Require using the modified module wrapper
	} catch(err) {
		Module.wrap = _wrap;

		throw err;
	}
    
	Module.wrap = _wrap;

	if(!(pluginModule instanceof Function)) {
		// Static plugin module (not receiving the common interface object)
		return;
	}

	// Dynamic plugin module getting passed the common interface object
	pluginModule(commonInterface);
}

function evalPluginModule(name: string, modulePath: string) {
	try {
		requirePluginModule(name, modulePath);
	} catch(err) {
		print.info(`An error occurred evaluating the '${name}' plug-in module`);
		print.error(err);
	}
}


export function registerPlugin(name: string, modulePath, options) {
    activePluginRegistry.set(name, {
		integrateManually: !!options.integrateManually,
		moduleDirPath: dirname(modulePath),
		muteEndpoints: !!options.muteEndpoints,	// TODO: Reconsider
		muteRendering: !!options.muteRendering,
	});
	
	evalPluginModule(name, modulePath);
}

export function reloadActivePlugin(name: string, modulePath: string) {
	evalPluginModule(name, modulePath);
}

export function retireveClientModuleScript(pluginName: string): string {
	return (activePluginRegistry.get(pluginName) || {}).clientModuleText;
}

export function retrieveIntegrationPluginNames(isCompound: boolean): Set<string> {
	return isCompound
		? new Set([...genericIntegrationList.any, ...genericIntegrationList.compoundOnly])
		: genericIntegrationList.any;
}

export function bindClientModule(associatedPluginName: string, relativePath: string, sharedProperties?: TObject, compoundOnly?: boolean) {
	// TODO: Swap shared and compound argument as of usage frequency (keep backwards compatibility with type check augmented overload)

	const pluginObj = activePluginRegistry.get(associatedPluginName);
	
	// Construct path to plugin client script file
	const clientModuleFilePath: string = join(pluginObj.moduleDirPath, relativePath).replace(/(\.js)?$/, ".js");

	// Read client module file
	if(!existsSync(clientModuleFilePath)) {
		throw new ReferenceError(`Client module file of plugin '${associatedPluginName}' not found at '${clientModuleFilePath}'`);
	}
	const bareClientScript = String(readFileSync(clientModuleFilePath));

	// Construct individual script module
	const modularClientScript: string[] = [`
        ${config.appIdentifier}["${associatedPluginName}"] = (() => {
            const ${config.thisRetainerIdentifier} = {
                endpoint: (body, options = {}) => {
                    return ${config.appIdentifier}["${config.appClientModuleName}"].mediateEndpoint("${associatedPluginName}", body, options.name, options.progressHandler);
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
    `]
    .map(part => {
    // Minifiy wrapper
        return part
            .replace(/([{};,])\s+/g, "$1")
            .trim();
    });

	// Register client module in order to be integrated into pages upon request
	pluginObj.clientModuleText = `${modularClientScript[0]}${bareClientScript}${(bareClientScript.slice(-1) != ";") ? ";" : ""}${modularClientScript[1]}`;
	pluginObj.compoundOnly = compoundOnly;
	pluginObj.endpoints = new Map();

	activePluginRegistry.set(associatedPluginName, pluginObj);
	
	// Manipulate generic integration set according to integration option
	genericIntegrationList
		.compoundOnly[(!pluginObj.integrateManually && compoundOnly) ? "add" : "delete"](associatedPluginName);
	genericIntegrationList
		.any[(!pluginObj.integrateManually && !compoundOnly) ? "add" : "delete"](associatedPluginName);
}