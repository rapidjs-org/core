
import { join } from "path";
import { existsSync, readFileSync } from "fs";

import { normalizePath } from "../../../util";

import { PROJECT_CONFIG } from "../../config/config.project";


function constructWebDirPath(path: string): string {
    return join(PROJECT_CONFIG.read("webDirectory").string, normalizePath(path));
}

// TODO: In-memory cache

export function exists(path: string): boolean {
    console.log(constructWebDirPath(path))
    return existsSync(constructWebDirPath(path));
}

export function read(path: string): string {
    return String(readFileSync(constructWebDirPath(path)));
}