
import { join } from "path";
import { statSync, existsSync, readFileSync } from "fs";
import { createHash } from "crypto";

import { normalizePath } from "../../util";
import { PROJECT_CONFIG } from "../../config/config.PROJECT";
import { LimitedDictionary } from "../../LimitedDictionary";
import { Cache } from "../../Cache";

import { IFileStamp } from "./interfaces.C";


class VirtualFileSystem extends LimitedDictionary<number, IFileStamp> {
    
	// TODO: Examine effect of cache proxy (temporary limited storage) in front of vfs
    private readonly cache: Cache<IFileStamp> = new Cache(null, normalizePath);

    constructor() {
    	super(null, normalizePath);
    }
	
    private computeETag(fileContents: string): string {
    	return createHash("md5").update(fileContents).digest("hex");
    }

    private retrieveLocalPath(path: string): string {
    	return normalizePath(join(PROJECT_CONFIG.read("webDirectory").string, path));
    }

    private computeFileStamp(fileContents: string): IFileStamp {
    	return {
    		contents: fileContents,
    		eTag: this.computeETag(fileContents)
    	};
    }

    protected validateLimitReference(mtimeMs: number, path: string) {
    	return (statSync(this.retrieveLocalPath(path)).mtimeMs == mtimeMs);
    }
	
    public exists(path: string): boolean {
    	if(this.cache.has(path) || super.hasEntry(path)) {
    		return true;
    	}

    	return !!this.write(path);
    }

    public read(path: string): IFileStamp {
    	let data: IFileStamp = this.cache.read(path);
    	if(data) {
    		return data;
    	}
		
    	if(!(data = super.getEntry(path))) {
    		// Try to write if intially not found
    		data = this.write(path);
    	}

    	return data;
    }

    public write(path: string): IFileStamp {
    	const localPath: string = this.retrieveLocalPath(path);
    	if(!existsSync(localPath)) {
    		return null;
    	}

    	const fileContents = String(readFileSync(localPath));
    	const fileStamp: IFileStamp = this.computeFileStamp(fileContents);

    	super.setEntry(path, statSync(localPath).mtimeMs, fileStamp);

    	this.cache.write(path, fileStamp);

    	return fileStamp;
    }

    public modifyExistingFile(path: string, modifiedFileContents: string): IFileStamp {
    	const currentStamp: IFileStamp = super.getEntry(path);

    	if(!currentStamp) {
    		return;
    	}
		
    	const fileStamp: IFileStamp = this.computeFileStamp(modifiedFileContents);
    	fileStamp.modified = true;
		
    	super.updateEntry(path, fileStamp);

    	this.cache.write(path, fileStamp);

    	return fileStamp;
    }

}


export const VFS = new VirtualFileSystem();