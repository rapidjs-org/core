import { dirname, normalize, join, isAbsolute } from "path";

import { parseOption } from "./args";


const wdPath: string = process.env.wd ?? dirname(process.argv[1]);  // TODO: Which path in workers ?
const argPath: string = parseOption("path", "P").string;


export const PATH: string = normalize(
    argPath
    ? (!isAbsolute(argPath)
        ? join(process.cwd(), argPath)
        : argPath)
    : wdPath
);


export function absolutizePath(relativePath: string): string {
    return join(PATH, relativePath);
}