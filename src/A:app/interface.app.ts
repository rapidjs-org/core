
import { IPCSignal } from "./IPCSignal";
import { ipcDown } from "./cluster";


export function plugin(reference: string, options: IPluginOptions) {
	// /^(@[a-z~-][a-z._~-]*\/)?[a-z~-][a-z._~-]*$/i.test(reference)
	let modulePath: string;
	try {
		modulePath = require("module")._resolveFilename(reference, require.main);
	} catch {
		throw new ReferenceError(`Cannot find plug-in from reference '${reference}'`);
	}

	// TODO: Derive name already
	const name = "test";
    
	ipcDown(IPCSignal.PLUGIN, {
		name,
		modulePath,
		options
	});
}