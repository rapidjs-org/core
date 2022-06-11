/**
 * Constant to retrieve the project individual working directory
 * referred to via PATH variable.
 */


import { dirname, isAbsolute, join } from "path";

import { argument } from "./argument";


// Initially construct absolute project root directory path.
// Use directory at given working directory path (parameter)
// or the actual working directory of the runtime otherwise.
const wdPath: string = process.env.wd || dirname(process.argv[1]);
const argPath: string = argument("path", "P").parameter;

export const PATH: string = argPath
? (!isAbsolute(argPath)
    ? join(wdPath || "", argPath)  // Absolutize path
    : argPath)
: wdPath;