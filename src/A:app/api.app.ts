
import config from "./app.config.json";

import { dirname } from "path";

import { eventEmitter as printEventEmitter } from "../print";

import { print } from "../print";

import { normalizePath } from "./util";
import { ipcDown } from "./cluster";
import { watch } from "./live/watch";
import { IPCSignal } from "./IPCSignal";
import { IPluginOptions } from "./B:socket/interfaces.plugin";


const pluginNameRegex = /^(@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*$/i;	// = npm package name syntax


export function plugin(reference: string, options: IPluginOptions) {
	reference = ((reference || "/").charAt(0) !== "/")
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
	|| (!pluginNameRegex.test(reference)
		? reference.match(/([^/]+\/)?[^/]+?$/i)[0].replace(/^((\.(\.)?)\/)*|((\.[jt]s)?$)/gi, "")
		: reference);
	
	// Name safe guards
	if(name === config.coreIdentifier) {
		throw new SyntaxError("Plug-in name illegally resolved to reserved name 'core'.");
	}
	if(!pluginNameRegex.test(name)) {
		throw new SyntaxError(`Resolved plug-in name '${name}' is not URL-safe.`);
	}

	// Communicate plug-in conmnection to sub-processes
	ipcDown(IPCSignal.PLUGIN_REGISTER, {
		name,
		modulePath,
		options
	});
	
	// Watch (live) plug-in directory (recursively)
	watch(dirname(modulePath), () => {
		// Communicate plug-in conmnection to sub-processes
		ipcDown(IPCSignal.PLUGIN_RELOAD, {
			name,
			modulePath
		});
	}, true, `Plug-in: ${name}`);

	// TODO: Connection message
	print.info(`↴ Plug-in '${name}'`);
}

/* export const events = {
	log: printEventEmitter
}; */