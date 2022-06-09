/**
 * Extensively format project configuration file in accordance
 * with the application specific needs.
 */


import { existsSync, mkdirSync } from "fs";

import { Config, util } from "../../core/core";

import { normalizeExtension } from "../util";

import DEFAULT_CONFIG from "./default.project.config.json";


Config["project"].mergeInDefault(DEFAULT_CONFIG);


Config["project"]
.format(configObj => {
	// Mandatory web directory enforcement
	if(!configObj.directory.web) {
		throw new ReferenceError(`Missing required web directory path configuration`);
	}

	configObj.directory.web = util.projectNormalizePath(configObj.directory.web);
    
	if(!existsSync(configObj.directory.web)) {
		try {
			mkdirSync(configObj.directory.web, {
				recursive: true
			});
		} catch {
			throw new ReferenceError(`Given web directory configuration neither exist nor can be created '${configObj.directory.web}'`);
		}
	}

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