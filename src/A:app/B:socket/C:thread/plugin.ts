
const config = {
	configFilePluginScopeName: "plugin",
	coreModuleIdentifier: "core",
	pluginConfigIdentifier: "pluginConfig",
	clientModuleAppName: "rapidJS",
	clientModuleReferenceName: {
		shared: "SHARED",
		public: "PUBLIC"
	},
	pluginNameRegex: /(@[a-z0-9+-][*a-z0-9._-]*\/)?[a-z0-9+-][a-z0-9._-]*/,
	pluginNameSeparator: "+",
	pluginRequestPrefix: "plug-in::",
	thisRetainerIdentifier: "$this"
};


import { PLUGIN_CONFIG } from "../../config/config.plugins";
import * as commonInterface from "../../interface.common";


const activePluginRegistry = {
    dict: new Map<string, {
        clientModuleText?: string;
    }>(),
    genericIntegrationList: new Set<string>()
};


export function registerActivePlugin(plugin: IPassivePlugin) {
    bindPlugin(plugin.name, plugin.modulePath);
    
    activePluginRegistry.dict.set(plugin.name, {
        clientModuleText: ""
    });

    // Manipulate generic integration set according to integration option
    activePluginRegistry.genericIntegrationList
    [plugin.options.integrateManually ? "delete" : "add"](plugin.name);
}


function bindPlugin(name: string, modulePath: string) {
    const Module = require("module");   // for runtime dynamic module wrapping
    
    // Temporarily manipulate wrapper in order to inject this assignment (representing the plugin interface)
    const _wrap = Module.wrap;
    // Require custom wrapped module (providing the plugin interface to the module context)
    let pluginModule;
    try {
        // const console = {
        //     log: message => {
        //         require("${require.resolve("../../utilities/output")}").log(message, "${name}")
        //     },
        //     error: err => {
        //         require("${require.resolve("../../utilities/output")}").error(err, false, "${name}");
        //     }
        // };
        Module.wrap = ((exports, _, __, __filename, __dirname) => {
            return `${Module.wrapper[0]}                
                const interface = require("${require.resolve("./interface.plugin.js")}");
                for(const prop in interface) {
                    this[prop] = interface[prop];
                }
                this.${config.pluginConfigIdentifier} = ${JSON.stringify(PLUGIN_CONFIG[name] as Record<string, unknown>)};
                
                const ${config.thisRetainerIdentifier} = this;
            ${exports}${Module.wrapper[1]}`;
        });

        pluginModule = require.main.require(modulePath);	// Require using the modified module wrapper
    } catch(err) {
        throw err;
    } finally {
        Module.wrap = _wrap;
    }

    // TODO: Option for muting output of threads except one to remove duplicates (static context)?

    if(!(pluginModule instanceof Function)) {
        // Static plugin module (not receiving the common interface object)
        return;
    }

    // Dynamic plugin module getting passed the common interface object
    pluginModule(commonInterface);
}