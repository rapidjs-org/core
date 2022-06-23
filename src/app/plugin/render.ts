
import { IEntityInfo, IPluginFeatureData } from "../interfaces";
import { retrieveEntityInfo } from "../entity";

import { TRenderHandler } from "./types";
import { activePluginRegistry } from "./registry";


// TODO:
// • Pre-render
// • Re-render
// • Cache render?
// ... auto deduction???


export function defineRender(associatedPluginName: string, renderHandler: TRenderHandler, options: {
    static?: boolean;
	cacheable?: boolean;
} = {}) {
    const pluginObj = activePluginRegistry.get(associatedPluginName);

	if(pluginObj.muteRenders) {
		return;
	}

	if(!(renderHandler instanceof Function) && typeof(renderHandler) !== "function") {
		throw new SyntaxError(`Given render handler argument of type ${typeof(renderHandler)}, expecting Function`);
	}

	pluginObj.renders[options.static ? "static" : "dynamic"].push({
		handler: renderHandler
	});

	activePluginRegistry.set(associatedPluginName, pluginObj);  // Referenced?
}

export function activateRender(markup: string, staticRender: boolean = false): string {
	const entityInfo: IEntityInfo = retrieveEntityInfo();
	
	activePluginRegistry.forEach((pluginObj, pluginName: string) => {
		let i = 0;

        pluginObj.renders[staticRender ? "static" : "dynamic"]
		.forEach((render: IPluginFeatureData<TRenderHandler>) => {
			markup = render.handler(markup, entityInfo);

			if(!markup) {
				throw new TypeError(`Render routine (${i}) of plug-in '${pluginName}' does not return serializable data (supposedly modfied markup)`);
			}

			i++;
		});
    });

	return markup;
}