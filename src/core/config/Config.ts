/**
 * Class representing a resolve interface for specific configuration file.
 * A configuration file is a JSON file located in the individual project
 * root directory given a name.
 * 
 */


import config from "../src.config.json";

import { existsSync } from "fs";

import { mergeObj, projectNormalizePath } from "../util";
import { MODE } from "../MODE";

// TODO: Reduce computation costs on runtime

export class Config {

    private readonly name: string;
    private readonly memory: Map<string[], unknown> = new Map();
	
    private configObj: TObject;

	/**
	 * @param {string} name Configuration file name (without mandatory, implicitly added prefix/suffix)
	 * @param {string} [alias] Alias from which to access the configuration file programmatically (for app config independence)
	 * @param {Object} [defaultConfig] Default configuration object to merge parsed object into (override)
	 */
    constructor(name: string, alias?: string, defaultConfig?: TObject) {
    	this.name = name;

    	Object.keys(MODE)
		.filter((name: string) => {
			return (MODE[name] === true);
		})
		.forEach((name: string) => {
    		this.configObj = mergeObj(this.configObj, this.readFile(`.${name}`));
    	});

		this.mergeInDefault(defaultConfig);

		// Create static property for each config object for project wide access
		Config[alias || name] = this;	// TODO: Works?
    }

    /**
     * Read and parse a specific config file to object representation.
     * @param {boolean} [suffix] File suffix (if is mode specific)
     * @returns {Object} Configuration object
     */
    private readFile(suffix: string = ""): TObject {
    	// Retrieve custom config object (depending on mode)
    	const customConfigPath = projectNormalizePath(`${config.configFilePrefix}.${this.name}${suffix}.json`);
        
		//unrequireModule(customConfigPath);	

    	return existsSync(customConfigPath)
    		? require(customConfigPath)
    		: {};
    }

	/**
	 * Read a specific configuration value.
	 * @param {...string} keys Key(s) (in order of JSON nesting)
	 * @returns 
	 */
    public read(...keys: string[]): {
        string: string,
        number: number,
        boolean: boolean,
        object: TObject
    } {
    	const value = !this.memory.has(keys)
		? (() => {
			let value;
			try {
				for(const key of keys) {
					value = (value || this.configObj)[key];
				}
			} catch {
				value = undefined;
			}

			value && this.memory.set(keys, value);	// Re-read if not (yet) set

			return value;
		})()
		: this.memory.get(keys);
		
    	return {
    		string: value ? String(value) : undefined,
    		number: !isNaN(Number(value)) ? Number(value) : undefined,
    		boolean: (value === true || value === "true") ? true : false,
    		object: Object.assign({}, value || {}) as TObject	// Prevent modification through call-by-reference
    	};
    }

	/**
	 * Merge in a default configuration file after initialization.
	 * @param {Object} [defaultConfig] Default config object
	 */
	public mergeInDefault(defaultConfig: TObject) {
    	// Default < Generic < Mode specific
		this.configObj = mergeObj(defaultConfig, this.configObj);
	}

	// TODO: Update formatter
    public format(formatCallback: (configObj) => TObject) {
		// TODO: Concise format error?
		this.configObj = formatCallback(this.configObj);
    }

	/**
	 * Retrieve native object representation of configuration
	 * @returns {Object} Configuration object representation
	 */
    public toObject(): TObject {
    	return this.configObj;
    }
}


/**
 * Always evaluate project config first in every memory context.
 * No cyclic dependency.
 */
if(!Config["project"]) {
	require("./config.project");
}