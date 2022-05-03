
const config = {
	filePrefix: "rapid."
};


import { existsSync } from "fs";

import { mergeObj } from "../../util";
import { MODE } from "../mode";

import { normalizePath } from "../util";


// TODO: Reduce computation costs on runtime

export class Config {
    private readonly name: string;

    private configObj: Record<string, any>;

    constructor(name: string, defaultConfig: Record<string, any> = {}) {
    	this.name = name;

    	// Default < Generic < Mode specific
    	this.configObj = mergeObj(defaultConfig, this.readFile());
    	for(const mode in MODE) {
    		this.configObj = (MODE[mode] === true)
    			? mergeObj(this.configObj, this.readFile(`.${mode.toLowerCase()}`))
    			: this.configObj;
    	}
    }

    /**
     * Read a specific config file.
     * @param {boolean} [suffix] File suffix (if mode specific)
     * @returns {Object} Configuration object
     */
    private readFile(suffix = "") {
    	// Retrieve custom config object (depending on mode)
    	const customConfigPath = normalizePath(`${config.filePrefix}${this.name}${suffix}.json`);
        
    	return existsSync(customConfigPath)
    		? require(customConfigPath)
    		: {};
    }

    public read(...keys: string[]): {
        string: string,
        number: number,
        boolean: boolean,
        object: any
    } {
    	let value: string|number|boolean;

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
    		object: value
    	};
    }

    public format(callback: (configObj: Record<string, any>) => Record<string, any>) {
    	this.configObj = callback(this.configObj);
    }

    public toObject() {
    	return this.configObj;
    }
}