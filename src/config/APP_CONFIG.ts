const devConfig = {
    configNamePrefixList: [ "rapidjs", "rjs" ],
};


import * as print from "../print";

import { Config } from "./Config";

import defaultConfig from "./default.config.json";


type TConstraintError = string;
type TConfigObject = Record<string, unknown>;
type TErroneousPropertyTriple = [string, TConstraintError, string];

interface IConstraintModelProperty {
    type: ETypeConstraint;

    optional?: boolean;
    pattern?: RegExp
}

interface IConstraintResult {
    erroneousProperties: TErroneousPropertyTriple[],
    expendableProperties: string[]
}


const EConstraintError: Record<string, string> = {
    ARRAY_EXPECTED: "Array property expected",
    ATOMIC_EXPECTED: "Atomic property expected", // TODO: Specify?
    SUB_PROPERTY_EXPECTED: "Sub-object property expected",
    ARRAY_TYPE_MISMATCH: "Invalid array property element type",
    ATOMIC_TYPE_MISMATCH: "Invalid property type",
    ARRAY_MALFORMED: "Invalid array property element format (pattern mismatch)",
    ATOMIC_MALFORMED: "Invalid string property format (pattern mismatch)",
    REQUIRED: "Required property not defined"
};


function checkType(value: unknown, typeName: string): boolean {
    return (String(typeof(value)).toLowerCase() === typeName);
}

function checkPattern(value: unknown, pattern: RegExp = /.*/): boolean {
    return pattern.test(String(value));
}

function applyConstraintModel(configObj: TConfigObject, model: TConfigObject): IConstraintResult {
    const result: IConstraintResult = {
        erroneousProperties: [],
        expendableProperties: []
    }

    const validatedKeys: Set<string> = new Set();
    for(const key in model) {
        // Normalize shortcuts to object representation
        const value: unknown = configObj[key];
        const modelProperty: IConstraintModelProperty = checkType(model[key], "string")
        ? {
            type: model[key] as ETypeConstraint
        }
        : model[key] as IConstraintModelProperty;

        const writeError = (err: TConstraintError, type?: string) => {
            result.erroneousProperties.push([
                key, err, (type ?? modelProperty.type)
            ]);
        };
        
        validatedKeys.add(key);

        if(value === undefined) {
            !modelProperty.optional
            && writeError(EConstraintError.REQUIRED);

            continue;
        }

        if(!modelProperty.type) {
            if(!checkType(value, "object") || Array.isArray(value)) {
                writeError(EConstraintError.SUB_PROPERTY_EXPECTED);

                continue;
            }

            // Sub-property model
            const subProperty = applyConstraintModel(value as TConfigObject, model[key] as TConfigObject);
            
            result.erroneousProperties = [
                ...result.erroneousProperties,
                ...subProperty.erroneousProperties
                .map((value: TErroneousPropertyTriple) => {
                    value[0] = `${key}.${value[0]}`;
                    
                    return value;
                })
            ];

            result.expendableProperties = [
                ...result.expendableProperties,
                ...subProperty.expendableProperties
                .map((property: string) => {
                    return `${key}.${property}`;
                })
            ];

            continue;
        }

        if(modelProperty.type === ETypeConstraint.ANY) {
            continue;
        }

        if(/^array:/.test(modelProperty.type)) {
            const arrayType: string = modelProperty.type.replace(/^array:/, "");

            if(!Array.isArray(value)) {
                writeError(EConstraintError.ARRAY_EXPECTED, arrayType);

                continue;
            }

            for(const element of value) {
                if(checkType(element, arrayType)) {
                    continue;
                }

                writeError(EConstraintError.ARRAY_TYPE_MISMATCH, arrayType);

                !checkPattern(value, modelProperty.pattern)
                && writeError(EConstraintError.ARRAY_MALFORMED, modelProperty.pattern.toString());

                break;
            }

            continue;
        }

        if(Array.isArray(value)) {
            writeError(EConstraintError.ATOMIC_EXPECTED);

            continue;
        }
        
        if(!checkType(value, modelProperty.type)) {
            writeError(EConstraintError.ATOMIC_TYPE_MISMATCH);

            continue;
        }

        !checkPattern(value, modelProperty.pattern)
        && writeError(EConstraintError.ATOMIC_MALFORMED, modelProperty.pattern.toString());
    }
    
    const expendableKeys: string[] = Object.keys(configObj)
    .filter(key => !validatedKeys.has(key));
    
    result.expendableProperties = [
        ...expendableKeys,
        ...result.expendableProperties
    ];

    return result;
}


export enum ETypeConstraint {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    ARRAY_STRING = "array:string",
    ARRAY_NUMBER = "array:number",
    ARRAY_BOOLEAN = "array:boolean",
    ANY = "any"
}

export const APP_CONFIG: TConfigObject = new Config(devConfig.configNamePrefixList, defaultConfig as TConfigObject).objectify();

export function constrain(model: unknown) {
    const constraintResult = applyConstraintModel(APP_CONFIG, model as TConfigObject);
    
    const abbreviate = (list: unknown[]) => {
        return {
            list: list.slice(0, 10),
            suffix: (list.length > 10) ? "\n      ..." : ""
        }
    };

    const erroneousProperties = abbreviate(constraintResult.erroneousProperties);
    if(erroneousProperties.list.length) {
        throw new SyntaxError(`Error in evaluation of config JSON:\n${
            erroneousProperties.list
            .map((property: TErroneousPropertyTriple) => {
                return `      ${property[1]} [ '${property[0]}': ${property[2]} ].`;
            })
            .join("\n")
        }${erroneousProperties.suffix}`);
    }
    
    const expendableProperties = abbreviate(constraintResult.expendableProperties);
    expendableProperties.list.length
    && print.info(`Config JSON is stated insignificant properties:\n${
        `      '${expendableProperties.list.join(", ")}'`
    }${expendableProperties.suffix}`);
}