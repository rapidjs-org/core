

import { readFileSync, existsSync } from "fs";
import { join } from "path";

import { PROJECT_CONFIG } from "../../../config/config.project";


const config = {
    reloadTimeout: 2500
};


interface WebFile {
    data: string,
    loadTime: number
}


const VFS: Map<string, WebFile> = new Map();


function constructPath(pathname: string) {
    return join(PROJECT_CONFIG.read("directory", "web").string, pathname);
}


export function read(pathname: string) {
    if(VFS.has(pathname)) {
        // Validate
    }

    if(!exists(pathname)) {
        throw new ReferenceError(`Web file does not exist '${pathname}'`);
    }

    const data: Buffer = readFileSync(constructPath(pathname));

    VFS.set(pathname, {
        data: String(data),
        loadTime: Date.now()
    });

    return data;
}

export function exists(pathname: string) {
    return existsSync(constructPath(pathname));
}