/**
 * Module containing the core interface plug-in handler function.
 */


import config from "../src.config.json";

import { util, print } from "../../core/core";

import { IPluginOptions } from "../interfaces";

import { registerPlugin } from "./registry";


const pluginNameRegex = /^(@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*$/i;	// ^= npm package name syntax


/**
 * Application concrete plug-in handler function serving the core interface.
 * @param {} req Thread request object
 * @param {core.IResponse} res Thread response object
 * @returns {core.IResponse} Modified thread response object
 */
export default function(reference: string, options: IPluginOptions = {}) {
    const isInstalledPackage: boolean = pluginNameRegex.test(reference);

    reference = (!isInstalledPackage && (reference || "/").charAt(0) !== "/")
    ? util.projectNormalizePath(reference)
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
    if(name === config.appClientModuleName) {
        throw new SyntaxError(`Plug-in name illegally resolved to reserved name '${config.appClientModuleName}'.`);
    }
    
    if(!pluginNameRegex.test(name)) {
        throw new SyntaxError(`Resolved plug-in name '${name}' is not URL-safe.`);
    }

    registerPlugin(name, modulePath, options);

    // Watch (live) plug-in directory (recursively)
    /* watch(dirname(modulePath), () => {
        // Communicate plug-in conmnection to sub-processes
        ipcDown(EIPCSignal.PLUGIN_RELOAD, {
            name,
            modulePath
        } as IPassivePlugin);
    }, true, `Plug-in: ${name}`); */

    // TODO: Connection message
    print.info(`↴ Plug-in '${name}'`);
}