/**
 * File modification detection and propagation for live functionality.
 */

const config = {
	detectionFrequency: 1000
};


import { readdir, stat, lstatSync, existsSync, Dirent } from "fs";
import { join, dirname } from "path";
import { spawn } from "child_process";


import { serverConfig } from "../config/config.server";

import { output } from "../utilities/output";
import { mode } from "../utilities/mode";

import { proposeRefresh } from "./server";


// Array of detection directories
const modRegistry: {
	path: string;
	recursive: boolean;

	callback: () => void;
}[] = [];


/**
 * Check whether a file has been modified within the last detection period
 * based on a given modification reference timestamp.
 * @param {number} time Modification reference timestamp
 * @returns {boolean} Whether has been modified
 */
function fileModified(time) {
	return (Math.abs(time - Date.now()) < config.detectionFrequency);
}

/**
 * Recursively scan a given directory for moification.
 * Modification to be effective if a file has been chnaged within
 * latest detection period.
 * @param {string} path Detection path (starting from root)
 * @param {Function} callback Function to call if modification has been detected
 */
async function scanDir(path: string, callback: () => void, recursive = true) {
	if(!existsSync(path)) {
		// Directory does not exist
		return;
	}

	// Read current directory
	readdir(path, {
		withFileTypes: true
	}, (_, dirents: Dirent[]) => {
		(dirents || []).forEach(dirent => {
			const curPath: string = join(path, dirent.name);

			if(recursive && dirent.isDirectory()) {
				// Scan sub directory
				return scanDir(curPath, callback, recursive);
			}

			checkFile(curPath, callback)
				.catch(_ => {
					throw true;
				});
		});
	});
}

/**
 * Scan a specific file for modification.
 * Modification to be effective if a file has been chnaged within
 * latest detection period.
 * @param {string} path Path to file
 * @param {Function} callback Function to call if modification has been detected
 * @returns {Promise} Rejects if modification has been detected
 */
async function checkFile(path, callback): Promise<void> {
	return new Promise((resolve, reject) => {
		// Read file stats to check for modification status
		stat(path, (_, stats) => {
			if(fileModified(stats.birthtime)
			|| fileModified(stats.mtimeMs)) {
				output.log(`File modified: Initiated live reload\n- ${path}`);
				
				// Change detected
				callback && callback();

				proposeRefresh();	// Always also reloas connected web client views

				reject();	// Cancel further checks for type
			}
		});

		resolve();
	});
}


/**
 * Register a directory for modification detection.
 * @param {string} path Absolute path to directory
 * @param {Function} callback Function to call if modification has been detected
 */
export function registerDetection(path: string, callback?: () => void, scanRecursively = true) {
	if(!mode.DEV) {
		// Only register in DEV MODE
		return;
	}

	modRegistry.push({
		path: path,
		recursive: scanRecursively,
		callback: callback
	});
}

// Initialize detection interval
mode.DEV && setInterval(_ => {
	// Scan registered directories / files respectively
	modRegistry.forEach(async mod => {
		if(lstatSync(mod.path).isDirectory()) {
			// Dir
			try {
				scanDir(mod.path, mod.callback, mod.recursive);
			} catch(feedback) {
				if(feedback === true) {
					return;	// Intended termination
				}

				// Actual error
				output.log("An error occurred performing a live reload:");
				output.error(feedback);
			}

			return;
		}
		
		// File
		await checkFile(mod.path, mod.callback);
	});
}, config.detectionFrequency);


// Watch project directory level (non-recursively) (server / main module, configs, ...)
registerDetection(dirname(serverConfig.directory.web), () => {
	// Restart app if file in project root has changed
	spawn(process.argv.shift(), process.argv, {
		cwd: process.cwd(),
		detached: true,
		stdio: "inherit"
	});

	process.exit();
}, false);

// Watch web file directory (recursively)
registerDetection(serverConfig.directory.web);