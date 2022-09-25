import { readFileSync } from "fs";
import { join } from "path";

import { parseFlag } from "./args";


if(parseFlag("help", "H")) {    // TODO: Global bin?
    const helpText: string = String(readFileSync(join(__dirname, "./help.txt")));
    console.log(helpText);

    process.exit(0);
}


process.on("uncaughtException", (err: Error) => {
});




module.exports = {
    
};