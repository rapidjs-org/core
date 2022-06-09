/**
 * Read and prepare server configuration file object to be consumed.
 * Implicit local file system paths construction and existence validation
 * and file extension normalization.
 */


import config from "../src.config.json";

import { isAbsolute } from "path";

import { mergeObj, projectNormalizePath } from "../util";
import { MODE } from "../MODE";

import DEFAULT_CONFIG from "./default.project.config.json";
import DEFAULT_CONFIG_PROD from "./default.project.config:prod.json";
import DEFAULT_CONFIG_DEV from "./default.project.config:dev.json";
import { Config } from "./Config";


new Config(config.configFileNameProject, "project", mergeObj(DEFAULT_CONFIG,
	MODE.PROD
	? DEFAULT_CONFIG_PROD
	: DEFAULT_CONFIG_DEV)
);


Config["project"]
.format(configObj => {
	configObj.directory.log = (configObj.directory.log && !isAbsolute(configObj.directory.log))
	? projectNormalizePath(configObj.directory.log)
	: null;

	// Define NaN or zero limits as limitless (infinite size)
	for(const key in configObj.limit) {
		configObj.limit[key] = isNaN(configObj.limit[key])
		? Infinity
		: configObj.limit[key] || Infinity;
	}
	
	return configObj;
});