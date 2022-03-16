
import { dirname, join } from "path";

import { binaryArgument } from "../args";


// Use directory at given path (argument)
// or working directory of execution otherwise
const wdPath: string = process.env.wd || dirname(process.argv[1]);
const argPath: string = binaryArgument("wd", "W");
// Construct absolute path from call point if relative path given
export const PROJECT_PATH: string = (argPath !== undefined)
? (/[^/]/.test(argPath)
    ? join(wdPath, argPath)
    : argPath)
: wdPath;