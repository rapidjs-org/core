
import { join } from "path";
import { statSync, existsSync, readFileSync } from "fs";

import { normalizePath } from "../../util";

import { MODE } from "../../mode";
import { PROJECT_CONFIG } from "../../config/config.project";

import { LimitedDictionary } from "./LimitedDictionary";
import { Cache } from "./Cache";
import { computeETag } from "./util";


// TODO: Examine effect of cache proxy (temporary limited storage) in front of vfs

interface FileStamp {
    contents: string,
    eTag: string
}

class VirtualFileSystem extends LimitedDictionary<number, FileStamp> {
    
    private readonly cache: Cache<FileStamp> = new Cache(null, normalizePath);

    constructor() {
    	super(null, normalizePath);
    }

    private retrieveLocalPath(path: string): string {
    	return normalizePath(join(PROJECT_CONFIG.read("webDirectory").string, path));
    }

    protected validateLimitReference(mtimeMs: number, path: string) {
    	return (statSync(this.retrieveLocalPath(path)).mtimeMs == mtimeMs);
    }

    public read(path: string): FileStamp {
    	let data: FileStamp;

    	if(data = this.cache.read(path)) {
    		return data;
    	}
		
    	if(MODE.DEV
		|| !(data = super.getEntry(path))) {
    		// Try to write if intially not found
    		this.write(path);
    	}

    	return data || super.getEntry(path);
    }

    public write(path: string) {
    	const localPath: string = this.retrieveLocalPath(path);
    	if(!existsSync(localPath)) {
    		return;
    	}

    	const fileContents = String(readFileSync(localPath));

    	const data: FileStamp = {
    		contents: fileContents,
    		eTag: computeETag(fileContents)
    	};

    	super.setEntry(path, statSync(localPath).mtimeMs, data);

    	this.cache.write(path, data);
    }

}


export const VFS = new VirtualFileSystem();