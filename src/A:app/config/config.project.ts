/**
 * Read and prepare server configuration file object to be consumed.
 * Implicit local file system paths construction and existence validation
 * and file extension normalization.
 */


import { existsSync, mkdirSync } from "fs";


import { mergeObj, normalizeExtension } from "../../util";

import { MODE } from "../mode";
import { normalizePath } from "../util";

import DEFAULT_CONFIG from "./default.project.config.json";
import DEFAULT_CONFIG_PROD from "./default.project.config:prod.json";
import DEFAULT_CONFIG_DEV from "./default.project.config:dev.json";
import { Config } from "./Config";


export const PROJECT_CONFIG = new Config("config", mergeObj(DEFAULT_CONFIG, MODE.PROD ? DEFAULT_CONFIG_PROD : DEFAULT_CONFIG_DEV));


interface IProjectConfig {
	extensionWhitelist: string[],
	webDirectory: string,
	mimes: Record<string, string>
}


PROJECT_CONFIG.format((configObj: TObject) => {
	const typedConfigObj = configObj as unknown as IProjectConfig;

	validatePath("web", typedConfigObj.webDirectory);
    
	// Normalize extension arrays for future uniform usage
	typedConfigObj.extensionWhitelist = (typedConfigObj.extensionWhitelist || [])
		.map(extension => {
			return normalizeExtension(extension);
		});

	// Normalize MIMEs map object keys (representing file extensions)
	const normalizedMimesMap: Record<string, string> = {};
	for(const extension in (typedConfigObj.mimes as Record<string, string>)) {
		normalizedMimesMap[normalizeExtension(extension)] = typedConfigObj.mimes[extension];
	}
	typedConfigObj.mimes = normalizedMimesMap;

	return typedConfigObj as unknown as TObject;
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

		return;
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
}