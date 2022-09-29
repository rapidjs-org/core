const devConfig = {
    configNameInfix: "config"
};


import { existsSync } from "fs";

import { MODE } from "../MODE";
import { absolutizePath } from "../PATH";


type TObject = Record<string, unknown>;


export class Config {

    private readonly obj: TObject;

    constructor(name: string|string[], defaultConfigObj: TObject = {}) {
        Object.keys(MODE)
        .filter(mode => (MODE as Record<string, boolean>)[mode])
        .concat([ "" ])
        .reverse()
        .forEach(mode => {
            defaultConfigObj = deepMergeObj(defaultConfigObj, this.read(name, mode));
        });

        this.obj = defaultConfigObj;
    }

    private read(name: string|string[], mode?: string) {
        name = [ name ].flat();

        let i = 0;
        let fullName: string,
            fullPath: string;
        do {
            fullName = `${name[i++]}.${devConfig.configNameInfix}${mode ? `.${mode.toLowerCase()}` : ""}.json`; // TODO: More config formats?
            fullPath = absolutizePath(`${fullName}`);
        } while(!existsSync(fullPath) && (i < name.length));
        
        if(!existsSync(fullPath)) {
            return {};
        }

        try {
            return require(fullPath);
        } catch(err) {
            throw SyntaxError(`Configuration file could not be parsed\n${err.message} '${fullName}'`);
        }
    }

    public objectify(): TObject {
        return this.obj;
    }

}


function deepMergeObj(...objs: TObject[]): TObject {
	if(objs.length === 1) {
		return objs[0];
	}
    
	const source = objs.pop() || {};
	let target = objs.pop() || {};

	for(const key of (Object.keys(target).concat(Object.keys(source)))) {
		if((target[key] || {}).constructor.name !== "Object"
        || (source[key] || {}).constructor.name !== "Object") {
			// Leaf
			target[key] = source[key] || target[key];
			
			continue;
		}
        
		// Recursive
		source[key] = deepMergeObj(target[key] as TObject|{}, source[key] as TObject|{});
	}

	target = {
        ...target,
        ...source
    };

	return deepMergeObj(...objs, target);
}