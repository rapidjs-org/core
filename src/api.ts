import { readFileSync } from "fs";
import { join } from "path";

import * as print from "./print";
import { MODE } from "./MODE";
import { parseFlag } from "./args";


if(parseFlag("help", "H")) {    // TODO: Global bin?
    const helpText: string = String(readFileSync(join(__dirname, "./help.txt")));
    console.log(helpText);

    process.exit(0);
}


process.on("uncaughtException", (err: Error) => print.error(err));


print.info(`Started server cluster. Running ${
    print.highlight(`${MODE.DEV ? "DEV" : "PROD"} MODE`, MODE.DEV ? [ 224, 0, 0 ] : null, 1)
}.`); // TODO: Display specific app name of implementation?


module.exports = {
    
};