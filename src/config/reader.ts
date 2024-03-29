/**
 * Configuration file reader with runtime mode dependant specific
 * file override.
 */

const config = {
	filePrefix: "rapid."
};


import { join, dirname } from "path";
import { existsSync } from "fs";

import { mode } from "../utilities/mode";
import { merge } from "../utilities/object";


/**
 * Read a specific config file
 * @param {string} name Configuration file name (formatted)
 * @param {boolean} [suffix] File suffix (if mode specific)
 * @returns {Object} Configuration object
 */
function readFile(name: string, suffix = "") {
	// Retrieve custom config object (depending on mode)
	const customConfigPath = join(dirname(require.main.filename),
		`${config.filePrefix}${name}${suffix}.json`);
	
	return existsSync(customConfigPath)
	? require(customConfigPath)
	: {};
}

/**
 * Read configuration files for a given name (genral and mode effective).
 * Convert to object representation and deep merge result.
 * @param {string} configName Configuration file name (formatted)
 * @param {Object} [defaultConfig] Default configuration object (static foundation)
 * @returns {Object} Resulting configuration object
 */
export function read(configName: string, defaultConfig: Record<string, unknown> = {}) {
	// Default < Generic < Mode specific
	let obj = merge(defaultConfig, readFile(configName)) as Record<string, unknown>;
	
	for(const modeName in mode) {
		obj = mode[modeName]
		? merge(obj, readFile(`${configName}.${modeName.toLowerCase()}`))
		: obj;
	}
	
	return obj;
}