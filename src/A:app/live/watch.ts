
const config = {
	detectionFrequency: 1000
};


import { readdir, stat, lstatSync, existsSync, Dirent } from "fs";
import { join } from "path";

import { print } from "../../print";
import { PROJECT_CONFIG } from "../config/config.project";

import { MODE } from "../mode";
import { normalizePath } from "../util";

import { proposeClientReload } from "./ws-server";


interface IWatchEntity {
	path: string;
	callback: () => void;
	scanRecursively: boolean;
}


const abortScanSignal = 1;
const watchRegistry: IWatchEntity[] = [];


// TODO: One line watch messaging?


// Initialize detection interval
MODE.DEV && setInterval(() => {
	// Scan registered directories / files respectively
	watchRegistry.forEach(async (entity: IWatchEntity) => {
		try {
			watchEntity(entity.path, entity.scanRecursively);
		} catch(err) {	// Abort signal entity watch iteration termination
			if(err !== abortScanSignal) {
				throw err;
			}
			console.log(err)
			entity.callback && entity.callback();
			
			proposeClientReload();	// Always also reload connected web client documents
		}
	});
}, config.detectionFrequency);


function watchEntity(path: string, scanRecursively?: boolean) {
	const fullPath: string = normalizePath(path);

	if(!existsSync(fullPath)) {
		// Directory does not exist
		return;
	}

	if(lstatSync(fullPath).isFile()) {
		checkFile(path)
		.then(() => {
			//throw abortScanSignal;
		});
	}

	// Read current directory
	readdir(fullPath, {
		withFileTypes: true
	}, (_, dirents: Dirent[]) => {
		(dirents || []).forEach(dirent => {
			if(!scanRecursively && dirent.isDirectory()) {
				return;
			}
			
			watchEntity(join(path, dirent.name), scanRecursively);
		});
	});
}

function checkFile(path: string): Promise<void|number> {
	const modificationOccurred = (time: number) => {
		return (Math.abs(time - Date.now()) < config.detectionFrequency);
	};
	
	return new Promise((resolve: (signal?: number) => void) => {
		// Read file stats to check for modification status
		stat(normalizePath(path), (_, stats) => {
			if(modificationOccurred(stats.birthtimeMs)
			|| modificationOccurred(stats.mtimeMs)) {
				// TODO: Output
				print.debug(`Registered file change ... initiating reload ('${path}')`);
				
				resolve(abortScanSignal);
			}

			resolve();
		});
	});
}


export function watch(path: string, callback: () => void, scanRecursively: boolean = true) {
	if(!MODE.DEV) {
		return;
	}

	watchRegistry.push({
		path: path,
		callback,
		scanRecursively
	});
}



/* // Watch project directory level (non-recursively) (server / main module, configs, ...)
watch("./", () => {
	// Restart app if file in project root has changed
	spawn(process.argv.shift(), process.argv, {
		cwd: process.cwd(),
		detached: true,
		stdio: "inherit"
	});

	process.exit();
}, false); */

// Watch web file directory (recursively)
watch(PROJECT_CONFIG.read("webDirectory").string, () => {
	console.log(999);
});


// TODO: IPC down for plugin reload action