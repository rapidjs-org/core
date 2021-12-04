/**
 * Plug-in naming related routines.
 */


import {existsSync} from "fs";
import {join, dirname, basename} from "path";

import pluginConfig from "../../config/config.plugins";

import {pluginRegistry} from "../bindings";


/**
 * Get path to plug-in module that activated calling function.
 * @param {string} fileName Name of current file for checking against (use __filename)
 * @returns {string} Plug-in module / caller path
 */
function getCallerPath(fileName: string): string {
	const err = new Error();
    
	Error.prepareStackTrace = (_, stack) => {
		return stack;
	};

	while(err.stack.length) {
		// @ts-ignore
		const callerFile = err.stack.shift().getFileName();
        
		if(callerFile !== (fileName || null) && callerFile !== __filename) {
			return callerFile;
		}
	}
    
	throw new ReferenceError("Failed to retrieve path to plug-in caller module");
}

// TODO: !!! Enable plug-in functionality on given generic basis
// =============================================================

/**
 * Get a plug-in directory path by respective module motivated call.
 * @param {string} fileName Name of current file for checking against (use __filename)
 * @returns {string} Plug-in path
 */
export function getPathByCall(fileName: string): string {
	return dirname(getCallerPath(fileName));
}

/**
 * Get a plug-in name by respective module motivated call.
 * @param {string} fileName Name of current file for checking against (use __filename)
 * @returns {string} Plug-in name
 */
export function getNameByCall(fileName: string): string {
	let path = getCallerPath(fileName);
	path = path.trim().replace(/\.ts$/, "");

	for(const name in Array.from(pluginRegistry.keys())) {
		if(pluginRegistry[name].reference === path) {
			return name;
		}
	}

	return undefined;
}

/**
 * Get a plug-in name by reference (dependency identifier or file system path).
 * Name derivation strategy:
 * Use dependency identifier if given
 * Use package name if exists at given path
 * Use resolving base file name (without extension) otherwise
 * @param {string} fileName Name of current file for checking against (use __filename)
 * @returns {string} Plug-in name
 */
export function getNameByReference(reference: string): string {
	// Installed plug-in dependency (use package name as given)
	if(!/^((\.)?\.)?\//.test(reference)) {
		return reference.toLowerCase();
	}

	// Locally deployed plug-in, path given (construct absolute local path file name)
	if(/^[^/]/.test(reference)) {
		reference = join(dirname(require.main.filename), reference);
	}
	
	const packagePath = join(dirname(reference), "package.json");
	const name = existsSync(packagePath) ? require(packagePath).name : null;
	if(name) {
		// Local plug-in with named package (use package name)
		return name.toLowerCase();
	}

	// Local plug-in without (named) package (use file name (without extension))
	return basename(reference).replace(/\.[a-z]+$/, "");
}

/**
 * Read a parameter value from the plug-in specific configuration file.
 * Automatically using plug-in scope, i.e. configuration sub object with the reading plug-in's name as key
 * @param {string} key Parameter key
 * @returns {string|number|boolean} Respective value if defined
 */
export function readPluginConfig(key: string): string|number|boolean {
	const pluginKey: string = getNameByCall(__filename);

	const subObj = pluginConfig[pluginKey];
	
	return subObj ? subObj[key] : undefined;
}