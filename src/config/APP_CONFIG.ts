const devConfig = {
    configNamePrefixList: [ "rapidjs", "rjs" ],
};


import { Config } from "./Config";

import defaultConfig from "./default.config.json";


constrain({});  // TODO


export enum ETypeConstraint {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    ARRAY = "array",
    ARRAY_STRING = "array:string",
    ARRAY_NUMBER = "array:number",
    ARRAY_BOOLEAN = "array:boolean",
    ANY = "any"
}


export const APP_CONFIG: Record<string, unknown> = new Config(devConfig.configNamePrefixList, defaultConfig).objectify();


export function constrain(model: Record<string, (
    {
        type: ETypeConstraint;

        required?: boolean;
        pattern?: RegExp
    } | ETypeConstraint
)>) {
    for(const key in model) {
        // console.log(key + ": " + model[key]);
    }
}