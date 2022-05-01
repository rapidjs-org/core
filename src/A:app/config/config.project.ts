/**
 * Read and prepare server configuration file object to be consumed.
 * Implicit local file system paths construction and existence validation
 * and file extension normalization.
 */


import { existsSync, mkdirSync } from "fs";


import { mergeObj, normalizeExtension } from "../../util";

import { MODE } from "../mode";
import { normalizePath } from "../util";

import { Config } from "./Config";
import DEFAULT_CONFIG from "./default.project.config.json";
import DEFAULT_CONFIG_PROD from "./default.project.config:prod.json";
import DEFAULT_CONFIG_DEV from "./default.project.config:dev.json";


export const PROJECT_CONFIG = new Config("config", mergeObj(DEFAULT_CONFIG, MODE.PROD ? DEFAULT_CONFIG_PROD : DEFAULT_CONFIG_DEV));

PROJECT_CONFIG.format((configObj: Record<string, any>) => {
	configObj.webDirectory = validatePath("web", configObj.webDirectory);
    
	// Normalize extension arrays for future uniform usage
	configObj.extensionWhitelist = (configObj.extensionWhitelist || [])
		.map(extension => {
			return normalizeExtension(extension);
		});

	// Normalize MIMEs map object keys (representing file extensions)
	const normalizedMimesMap: Record<string, string> = {};
	for(const extension in (configObj.mimes as Record<string, string>)) {
		normalizedMimesMap[normalizeExtension(extension)] = configObj.mimes[extension];
	}
	configObj.mimes = normalizedMimesMap;

	return configObj;
});


/**
 * Normalize and validate project local configuration path.
 * Aborts start-up if given a non-existing path.
 * @param {string} caption Path caption for error output
 * @param {string} path Path property
 * @param {boolean} [require] Whether path is required to be given and exist (or able to be created)
 * @returns {string} Absolute path representation in fs
 */
function validatePath(caption: string, path: string, require = false) {
	if(!path) {
		if(require) {
			throw new ReferenceError(`Missing required ${caption} directory path configuration`);
		}

		return undefined;
	}

	path = normalizePath(path);
    
	if(!existsSync(path)) { // TODO: Create dir?
		try {
			mkdirSync(path, {
				recursive: true
			});
		} catch {
			throw new ReferenceError(`Given ${caption} directory configuration neither exist nor can be created '${path}'`);
		}
	}

	return path;
}