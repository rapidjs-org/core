
import config from "./app.config.json";

import { dirname } from "path";

import { eventEmitter as printEventEmitter } from "../print";

import { print } from "../print";

import { normalizePath } from "./util";
import { ipcDown } from "./cluster";
import { watch } from "./watch/watch";
import { EIPCSignal } from "./EIPCSignal";
import { IPassivePlugin, IPluginOptions } from "./B:worker/interfaces.B";


const pluginNameRegex = /^(@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*$/i;	// = npm package name syntax


export function plugin(reference: string, options: IPluginOptions = {}) {
	const isInstalledPackage: boolean = pluginNameRegex.test(reference);

	reference = (!isInstalledPackage && (reference || "/").charAt(0) !== "/")
		? normalizePath(reference)
		: reference;
	
	// Retrieve fully qualified plug-in app module file path
	let modulePath: string;
	try {
		modulePath = require("module")._resolveFilename(reference, require.main);
	} catch {
		throw new ReferenceError(`Cannot find plug-in from reference '${reference}'`);
	}
	
	// Derive unique plug-in associated runtime name
	const name = options.alias
	|| (!isInstalledPackage
		? reference.match(/([^/]+\/)?[^/]+?$/i)[0].replace(/^((\.(\.)?)\/)*|((\.[jt]s)?$)/gi, "")
		: reference);
	
	// Name safe guards
	if(name === config.coreIdentifier) {
		throw new SyntaxError(`Plug-in name illegally resolved to reserved name '${config.coreIdentifier}'.`);
	}
	if(!pluginNameRegex.test(name)) {
		throw new SyntaxError(`Resolved plug-in name '${name}' is not URL-safe.`);
	}

	// Communicate plug-in conmnection to sub-processes
	ipcDown(EIPCSignal.PLUGIN_REGISTER, {
		name,
		modulePath,
		options
	} as IPassivePlugin);
	
	// Watch (live) plug-in directory (recursively)
	watch(dirname(modulePath), () => {
		// Communicate plug-in conmnection to sub-processes
		ipcDown(EIPCSignal.PLUGIN_RELOAD, {
			name,
			modulePath
		} as IPassivePlugin);
	}, true, `Plug-in: ${name}`);

	// TODO: Connection message
	print.info(`↴ Plug-in '${name}'`);
}

/* export const events = {
	log: printEventEmitter
}; */