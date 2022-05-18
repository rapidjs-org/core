
const config = {
	...require("../app.config.json"),

	detectionFrequency: 1000
};


import { readdir, stat, lstatSync, existsSync, Dirent } from "fs";
import { join } from "path";

import { print } from "../../print";
import { PROJECT_CONFIG } from "../config/config.project";

import { MODE } from "../mode";
import { normalizePath, retrieveModeNames } from "../util";

import { proposeClientReload } from "./ws-server";


interface IWatchEntity {
	path: string;

	callback?: () => void;
	messageIndicator?: string;
	scanRecursively?: boolean;
}


const watchRegistry: IWatchEntity[] = [];
const curRunIndexLocks: Set<number> = new Set();


// TODO: One line watch messaging?


// Initialize detection interval
MODE.DEV && setInterval(() => {
	curRunIndexLocks.clear();

	// Scan registered directories / files respectively
	let i: number = 0;
	watchRegistry.forEach(async (entity: IWatchEntity) => {
		watchEntity(i++, entity.path, entity);
	});
}, config.detectionFrequency);


function watchEntity(index: number, path: string, entity: IWatchEntity) {
	if(curRunIndexLocks.has(index)) {
		return;
	}

	const fullPath: string = /^[^/]/.test(path)
	? normalizePath(path)
	: path;

	if(!existsSync(fullPath)) {
		// File does not exist
		// Always check again as of possible creation throughout on runtime
		return;
	}

	const modificationOccurred = (time: number) => {
		return (Math.abs(time - Date.now()) < config.detectionFrequency);
	};

	if(lstatSync(fullPath).isFile()) {
		stat(fullPath, (_, stats) => {
			if(modificationOccurred(stats.birthtimeMs)
			|| modificationOccurred(stats.mtimeMs)) {
				curRunIndexLocks.add(index);

				// TODO: Output
				print.debug(`Registered file change '${entity.messageIndicator || path}' ⟳`);

				entity.callback && entity.callback();
				
				proposeClientReload();	// Always also reload connected web client documents (TODO: Only load if is touched?)
			}
		});
	}

	// Read current directory
	readdir(fullPath, {
		withFileTypes: true
	}, (_, dirents: Dirent[]) => {
		(dirents || []).forEach(dirent => {
			if(!entity.scanRecursively && dirent.isDirectory()) {
				return;
			}
			
			watchEntity(index, join(path, dirent.name), entity);
		});
	});
}


export function watch(path: string, callback?: () => void, scanRecursively: boolean = true, messageIndicator?: string) {
	// NOTICE: Do not watch from sub-processes, but watch from master and IPC signal accordingly.
	// Prevent multiple parallel fs watch processes.

	if(!MODE.DEV) {
		return;
	}
		console.log(path);

	watchRegistry.push({
		path: path,

		callback,
		messageIndicator,
		scanRecursively
	});
}


// Minimum watch handlers:

// Config files

function watchConfigFile(typeName: string) {
	retrieveModeNames().forEach((modeName: string) => {
		watch(`${config.configFilePrefix}.${typeName}.${modeName}.json`, () => {
			// Update configs
			// Replug plugins
			// TODO: IPC
		});
	});
}

watchConfigFile(config.configFileNameProject);
watchConfigFile(config.configFileNamePlugins);

// Web file directory (recursively)

watch(PROJECT_CONFIG.read("webDirectory").string);