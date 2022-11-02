import { join } from "path";

import { PATH } from "../../PATH";


const devConfig = {
    selfContextIdentifier: "$this"
};


export class Plugin {
    
    private readonly name: string;

    constructor(path: string) {
        require(join(PATH, path));

        // TODO: Define $this
    }

}