/**
 * Constant referencing the application unique virtual web file system
 * interface implementing a file adaptive limit dictionary.
 * Extending helper class representing a virtual files system for web files
 * living within the application environment in order to enhance disc file
 * system I/O operation costs.
 */


import { join, normalize as normalizePath } from "path";
import { statSync, existsSync, readFileSync } from "fs";


import { LimitDictionary, Cache, Config } from "../core/core";


class VirtualFileSystem extends LimitDictionary<number, string> {
    
	// TODO: Examine effect of cache proxy (temporary limited storage) in front of vfs
    private readonly cache: Cache<string> = new Cache(null, normalizePath);
	private readonly modifiedFilesSet: Set<string> = new Set();

    constructor() {
    	super(null, normalizePath);
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
	 * Validate a current file existence attribute against the limit reference.
	 * @param {number} mtimeMs Timestamp associated with a file existence attribute
	 * @param {string} path Path to file to check validity for
	 * @returns {boolean} Whether the limit has not been exceeded / file has not changed
	 */
    protected validateLimitReference(mtimeMs: number, path: string): boolean {
		// TODO: Only validate once a defined window
    	return (statSync(this.retrieveLocalPath(path)).mtimeMs === mtimeMs);
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
    public read(path: string): string {
    	let data: string = this.cache.read(path);
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
    public write(path: string): string {
    	const localPath: string = this.retrieveLocalPath(path);
    	if(!existsSync(localPath)) {
    		return null;
    	}

    	const fileContents = String(readFileSync(localPath));

    	super.write(path, fileContents, statSync(localPath).mtimeMs);

    	this.cache.write(path, fileContents);

		this.modifiedFilesSet.delete(normalizePath(path));

    	return fileContents;
    }

	/**
	 * Modify an existing web file in the VFS without writing to the
	 * physical file or changing its reference value.
	 * @param {string} path Project relative path to web file
	 * @param {string} modifiedFileContents Modified file contents to store
	 * @returns {IFileStamp} Related (resulting) file stamp
	 */
    public modifyExistingFile(path: string, modifiedFileContents: string): string {
    	const currentStamp: string = super.read(path);

    	if(!currentStamp) {
    		return;
    	}
		
    	super.update(path, modifiedFileContents);

    	this.cache.write(path, modifiedFileContents);

		this.modifiedFilesSet.add(normalizePath(path));

    	return modifiedFileContents;
    }

	/**
	 * Check whether a certain web file has been virtually modified
	 * using this.modifyExistingFile().
	 * @param {string} path Project relative path to web file
	 * @returns {boolean} Whether the file has been modified
	 */
	public wasModified(path: string): boolean {
		return this.modifiedFilesSet.has(normalizePath(path));
	}

}


// Expose singleton use constant
export const VFS = new VirtualFileSystem();