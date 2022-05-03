
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


import { print } from "../../../print";

import { PLUGIN_CONFIG } from "../../config/config.plugins";
import * as commonInterface from "../../interface.common";


const interfaceModulePath: string = require.resolve("./interface.plugin");

const activePluginRegistry = {
	dict: new Map<string, {
        clientModuleText?: string;
    }>(),
	genericIntegrationList: new Set<string>()
};


function evalPlugin(name: string, modulePath: string) {
    return;
    
	// Empty module cache (for eventual re-evaluation; live behavior in DEV MODE)
	if(require.cache[modulePath]) {
		delete require.cache[modulePath];
	}

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
		Module.wrap = ((_exports, _, __, __filename, __dirname) => {
			return `${Module.wrapper[0]}
                for(const prop in require("${interfaceModulePath}")) {
                    this[prop] = require("${interfaceModulePath}")[prop];
                }
                
                this.${config.pluginConfigIdentifier} = ${JSON.stringify(PLUGIN_CONFIG)};
                const ${config.thisRetainerIdentifier} = this;
            ${_exports}${Module.wrapper[1]}`;
		});

		pluginModule = require.main.require(modulePath);	// Require using the modified module wrapper
	} catch(err) {
		Module.wrap = _wrap;

		throw err;
	}

	Module.wrap = _wrap;

	// TODO: Option for muting output of threads except one to remove duplicates (static context)?

	if(!(pluginModule instanceof Function)) {
		// Static plugin module (not receiving the common interface object)
		return;
	}

	// Dynamic plugin module getting passed the common interface object
	pluginModule(commonInterface);
}


export function registerActivePlugin(plugin: IPassivePlugin) {
	try {
		evalPlugin(plugin.name, plugin.modulePath);
	} catch(err) {
		print.info(`An error occurred within the '${plugin.name}' plug-in module`);
		print.error(err);
	}
    
	activePluginRegistry.dict.set(plugin.name, {
		clientModuleText: ""
	});

	// Manipulate generic integration set according to integration option
	activePluginRegistry.genericIntegrationList
		[plugin.options.integrateManually ? "delete" : "add"](plugin.name);
}

export function bindClientModule(relativePath: string, sharedProperties?: Record<string, any>, compoundOnly?: boolean) {
	console.log(relativePath);

	/* const pluginName: string = Plugin.getNameByCall(__filename);	// TODO: Wont work with main file implicit local referencing (file path comparison); Fix!

    // TODO: Swap shared and compound argument as of usage frequency (keep backwards compatibility with type check augmented overload)

    if(/^\//.test(relativePath)) {
        throw new SyntaxError(`Expecting relative path to plugin client module upon initialization, given absolute path '${relativePath}' for '${pluginName}'`);
    }

    // Construct path to plugin client script file
    const pluginDirPath: string = dirname(Plugin.getCallerPath(__filename));
    let clientFilePath: string = join(pluginDirPath, relativePath);
    clientFilePath = (extname(clientFilePath).length == 0)
        ? `${clientFilePath}.js`
        : clientFilePath;

    // Read client module file
    if(!existsSync(clientFilePath)) {
        throw new ReferenceError(`Client module file for plugin '${pluginName}' not found at given path '${clientFilePath}'`);
    }

    const bareClientScript = String(readFileSync(clientFilePath));

    // Construct individual script module
    const modularClientScript: string[] = [`
        ${config.clientModuleAppName} = {
            ... ${config.clientModuleAppName},
            ... {
                "${pluginName}": (_ => {
                    const console = {
                        log: message => {
                            const atomic = ["string", "number", "boolean"].includes(typeof(message));
                            window.console.log(\`%c[rJS]%c[${pluginName}] %c\${atomic ? message : "\u2193"}\`, "color: gold;", "color: DarkTurquoise;", "color: auto;");
                            !atomic && window.console.log(message);
                        },
                        error: err => {
                            window.console.log(\`%c[rJS]%c[${pluginName}] %c\${err.message}\`, "color: gold;", "color: DarkTurquoise;", "color: red;");
                            window.console.error(err);
                        }
                    };

                    const endpoint = {
                        use: (body, progressHandler) => {
                            return ${config.clientModuleAppName}.${config.coreModuleIdentifier}.toEndpoint("${pluginName}", body, progressHandler);
                        },
                        useNamed: (name, body, progressHandler) => {
                            return ${config.clientModuleAppName}.${config.coreModuleIdentifier}.toEndpoint("${pluginName}", body, progressHandler, name);
                        }
                    };
                    
                    const ${config.thisRetainerIdentifier} = {
                        endpoint: endpoint.use,
                        useEndpoint: endpoint.use,
                        namedEndpoint: endpoint.useNamed,
                        useNamedEndpoint: endpoint.useNamed,

                        ${config.clientModuleReferenceName.public}: {},
                        ${config.clientModuleReferenceName.shared}: ${JSON.stringify(sharedConfig)}
                    };

                    for(const member in ${config.thisRetainerIdentifier}) {
                        this[member] = ${config.thisRetainerIdentifier}[member]
                    }

                    delete endpoint;
                    
                    `,`
                    
                    return ${config.thisRetainerIdentifier}.${config.clientModuleReferenceName.public};
                })()
            }
        }
    `]
        .map(part => {
            // Minifiy wrapper
            return part
                .replace(/([{};,])\s+/g, "$1")
                .trim();
        });

    // Register client module in order to be integrated into pages upon request// Write module and compound directive to registry
    const registryEntry = Plugin.registry.get(pluginName);

    registryEntry.clientScript = Buffer.from(`${modularClientScript[0]}${bareClientScript}${(bareClientScript.slice(-1) != ";") ? ";" : ""}${modularClientScript[1]}`, "utf-8");
    registryEntry.compoundOnly = compoundOnly; */
}