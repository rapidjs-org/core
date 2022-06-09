/**
 * Constant referencing the application unique virtual web file system
 * interface implementing a file adaptive limit dictionary.
 * Extending helper class representing a virtual files system for web files
 * living within the application environment in order to enhance disc file
 * system I/O operation costs.
 */


import { join, normalize } from "path";
import { statSync, existsSync, readFileSync } from "fs";
import { createHash } from "crypto";


import { LimitDictionary, Cache, Config } from "../../core/core";


interface IFileStamp {
	contents: string;
	eTag: string;

	modified?: boolean;
}


class VirtualFileSystem extends LimitDictionary<number, IFileStamp> {
    
	// TODO: Examine effect of cache proxy (temporary limited storage) in front of vfs
    private readonly cache: Cache<IFileStamp> = new Cache(null, normalize);

    constructor() {
    	super(null, normalize);
    }
	
	/**
	 * Compute the ETag value of a file given its contents.
	 * The ETag value corresponds to the MD5 hashed file contents.
	 * @param {string} fileContents File contents
	 * @returns {string} ETag value
	 */
    private computeETag(fileContents: string): string {
    	return createHash("md5")
		.update(fileContents)
		.digest("hex");
    }

	/**
	 * Retrieve the absolute path of a file on the local machine
	 * given a project relative path.
	 * @param {string} path Project relative path
	 * @returns {string} Absolute path
	 */
    private retrieveLocalPath(path: string): string {
    	return join(Config["project"].read("directory", "web").string, path);
    }

	/**
	 * Construct a file stamp object from file contents.
	 * @param {string} fileContents File contents
	 * @returns {IFileStamp} File stamp (contents and repsective ETag)
	 */
    private constructFileStamp(fileContents: string): IFileStamp {
    	return {
    		contents: fileContents,
    		eTag: this.computeETag(fileContents)
    	};
    }

	/**
	 * Validate a current file existence attribute against the limit reference.
	 * @param {number} mtimeMs Timestamp associated with a file existence attribute
	 * @param {string} path Path to file to check validity for
	 * @returns {boolean} Whether the limit has not been exceeded / file has not changed
	 */
    protected validateLimitReference(mtimeMs: number, path: string): boolean {
    	return (statSync(this.retrieveLocalPath(path)).mtimeMs == mtimeMs);
    }
	
	/**
	 * Check whether a physical web file exists.
	 * @param {string} path Project relative path to web file
	 * @returns {boolean} Whether the file exists
	 */
    public exists(path: string): boolean {
    	if(this.cache.has(path) || super.has(path)) {
    		return true;
    	}

    	return !!this.write(path);
    }

	/**
	 * Read a specific physical web file.
	 * @returns {IFileStamp} Related file stamp
	 */
    public read(path: string): IFileStamp {
    	let data: IFileStamp = this.cache.read(path);
    	if(data) {
    		return data;
    	}
		
    	if(!(data = super.read(path))) {
    		// Try to write if intially not found
    		data = this.write(path);
    	}

    	return data;
    }

	/**
	 * Write a specific physical web file.
	 * @param {string} path Project relative path to web file
	 * @returns {IFileStamp} Related (resulting) file stamp
	 */
    public write(path: string): IFileStamp {
    	const localPath: string = this.retrieveLocalPath(path);
    	if(!existsSync(localPath)) {
    		return null;
    	}

    	const fileContents = String(readFileSync(localPath));
    	const fileStamp: IFileStamp = this.constructFileStamp(fileContents);

    	super.write(path, fileStamp, statSync(localPath).mtimeMs);

    	this.cache.write(path, fileStamp);

    	return fileStamp;
    }

	/**
	 * Modify an existing web file in the VFS without writing to the
	 * physical file or changing its reference value.
	 * @param {string} path Project relative path to web file
	 * @param {string} modifiedFileContents Modified file contents to store
	 * @returns {IFileStamp} Related (resulting) file stamp
	 */
    public modifyExistingFile(path: string, modifiedFileContents: string): IFileStamp {
    	const currentStamp: IFileStamp = super.read(path);

    	if(!currentStamp) {
    		return;
    	}
		
    	const fileStamp: IFileStamp = this.constructFileStamp(modifiedFileContents);
    	fileStamp.modified = true;
		
    	super.update(path, fileStamp);

    	this.cache.write(path, fileStamp);

    	return fileStamp;
    }

}


// Expose singleton use constant
export const VFS = new VirtualFileSystem();