
const config = {
	filePrefix: "rapid."
};


import { join } from "path";
import { existsSync } from "fs";

import { mergeObj } from "../utils";
import { PROJECT_PATH } from "../path";
import { MODE } from "../mode";


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
        const customConfigPath = join(PROJECT_PATH,
            `${config.filePrefix}${this.name}${suffix}.json`);
        
        return existsSync(customConfigPath)
        ? require(customConfigPath)
        : {};
    }

    public read(...keys: string[]): {
        string: string,
        number: number,
        boolean: boolean
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
            string: String(value),
            number: Number(value),
            boolean: (value === true || value === "true") ? true : false
        };
    }

    public format(callback: (configObj: Record<string, any>) => Record<string, any>) {
        this.configObj = callback(this.configObj);
    }
}