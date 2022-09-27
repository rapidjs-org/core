import { dirname, normalize, isAbsolute, join } from "path";

import { parseOption } from "./args";


const wdPath: string = process.env.wd || dirname(process.argv[1]);  // TODO: Which path in workers ?
const argPath: string = parseOption("path", "P").string;

export const PATH: string = normalize(
    argPath
    ? (!isAbsolute(argPath)
        ? join(wdPath, argPath)
        : argPath)
    : wdPath
);