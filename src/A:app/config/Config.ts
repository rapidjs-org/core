
import config from "../app.config.json";

import { existsSync } from "fs";

import { mergeObj } from "../../util";

import { retrieveModeNames, normalizePath } from "../util";


// TODO: Reduce computation costs on runtime

export class Config {
    private readonly name: string;

    private configObj: TObject;

    constructor(name: string, defaultConfig: TObject = {}) {
    	this.name = name;

    	// Default < Generic < Mode specific
    	this.configObj = mergeObj(defaultConfig, this.readFile());

    	retrieveModeNames().forEach((name: string) => {
    		this.configObj = mergeObj(this.configObj, this.readFile(`.${name}`));
    	});
    }

    /**
     * Read a specific config file.
     * @param {boolean} [suffix] File suffix (if mode specific)
     * @returns {Object} Configuration object
     */
    private readFile(suffix = "") {
    	// Retrieve custom config object (depending on mode)
    	const customConfigPath = normalizePath(`${config.configFilePrefix}.${this.name}${suffix}.json`);
        
    	return existsSync(customConfigPath)
    		? require(customConfigPath)
    		: {};
    }

    public read(...keys: string[]): {
        string: string,
        number: number,
        boolean: boolean,
        object: TObject
    } {
    	let value;
    	try {
    		for(const key of keys) {
    			value = (value || this.configObj)[key];
    		}
    	} catch {
    		value = undefined;
    	}
		
    	return {
    		string: (value !== undefined) ? String(value) : undefined,
    		number: !isNaN(Number(value)) ? Number(value) : 0,
    		boolean: (value === true || value === "true") ? true : false,
    		object: Object.assign({}, value || {}) as TObject	// Prevent modification through call-by-reference
    	};
    }

    public format(callback: (configObj: unknown) => TObject) {
    	this.configObj = callback(this.configObj);
    }

    public toObject() {
    	return this.configObj;
    }
}