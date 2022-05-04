
const config = {
	...require("../../../app.config.json"),

	pluginRequestPrefix: "plug-in::",
	pluginRequestSeparator: "+",
	privateWebFilePrefix: "_"
};


import { readFileSync } from "fs";
import { join, extname } from "path";

import { MODE } from "../../../mode";

import { Status } from "../../Status";

import { VFS } from "../vfs";
import { parseSubdomain, computeETag } from "../util";
import { retireveClientModuleScript, retrieveIntegrationPluginNames } from "../plugin/registry";


const pluginReferenceSourceRegexStr = `/${config.pluginRequestPrefix}((@[a-z0-9~-][a-z0-9._~-]*/)?[a-z0-9~-][a-z0-9._~-]*(\\${config.pluginRequestSeparator}(@[a-z0-9~-][a-z0-9._~-]*/)?[a-z0-9~-][a-z0-9._~-]*)*)?`;

const coreModuleText = String(readFileSync(join(__dirname, "../plugin/client.core.js")));


export default function(tReq: IThreadReq, tRes: IThreadRes): IThreadRes {
	// Retrieve type of asset request to apply respective sub-routine
	if((new RegExp(`^${pluginReferenceSourceRegexStr}$`, "i")).test(tReq.pathname)) {
		// Plug-in module request
		tRes = handlePlugin(tRes, tReq.pathname);

		return tRes;
	}
	
	const extension: string = extname(tReq.pathname).replace(/^\./, "");	// Case sensitivity for dynamic file extension?
	
	// Permanently redirect dynamic extension explicit dynamic file requests to implicit variant
	if(extension === config.dynamicFileExtension) {
		//tRes.status = Status.REDIRECT;

		// tRes.headers.set("Location", "/");

		// TODO: Redirect method to keep host and additional URL information
		tRes.message = "To be redirected";

		return tRes;
	}

	// Handle request accordingly
	tRes = (extension.length > 0)
		? handleStatic(tRes, tReq.pathname)	// Static file (any file that is not a .HTML file (system web page type))
		: handleDynamic(tRes, tReq);		// Dynamic file
	
	if(tRes.status !== Status.SUCCESS) {
		return tRes;
	}

	if(!MODE.dev
	&& tRes.headers.get("ETag")
    && tReq.headers.get("If-None-Match") == tRes.headers.get("ETag")) {
		tRes.status = Status.USE_CACHE;

		return tRes;    // TODO: Respond shorthand?
	}

	return tRes;
}


function handlePlugin(tRes: IThreadRes, path: string): IThreadRes {
	// TODO: Plug-in combination pattern cache?
	const requestedPluginNames: Set<string> = new Set(path
		.slice(config.pluginRequestPrefix.length + 1)
		.split(new RegExp(`\\${config.pluginRequestSeparator}`, "g")));

	if(requestedPluginNames.size === 0) {
		tRes.status = Status.NOT_ACCEPTABLE;

		return tRes;
	}
	
	let cumulatedClientModuleScripts = "";

	// Always write core module text first if is requested (as of dependencies)
	if(requestedPluginNames.delete(config.coreIdentifier)) {
		cumulatedClientModuleScripts += coreModuleText;
	}

	requestedPluginNames.forEach((name: string) => {
		const clientModuleScriptText: string = retireveClientModuleScript(name);
		
		clientModuleScriptText
			? cumulatedClientModuleScripts += `\n${clientModuleScriptText}`
			: tRes.status = Status.PARTIAL_INFORMATION;
	});

	if(cumulatedClientModuleScripts.length === 0) {
		tRes.status = Status.NOT_FOUND;
		
		return tRes;
	}

	tRes.message = cumulatedClientModuleScripts;

	return tRes;
}

function handleStatic(tRes: IThreadRes, path: string): IThreadRes {
	if((new RegExp(`/${config.privateWebFilePrefix}`)).test(path)) {
		tRes.status = Status.NOT_FOUND;
		
		return tRes;
	}

	const fileStamp = VFS.read(path);

	if(fileStamp === undefined) {
		tRes.status = Status.NOT_FOUND;
	} else {
		tRes.message = fileStamp.contents;
		
		tRes.headers.set("ETag", fileStamp.eTag);
	}

	return tRes;
}

function handleDynamic(tRes: IThreadRes, tReq: IThreadReq): IThreadRes {
	const subdomain = parseSubdomain(tReq.hostname);

	tReq.pathname += `.${config.dynamicFileExtension}`;

	// TODO: Error routine
	// TODO: How to handle generic error routine?
	
	if((new RegExp(`/${config.privateWebFilePrefix}`)).test(tReq.pathname)) {
		tRes.status = Status.FORBIDDEN;	// TODO: tRes as class / object?
		
		return tRes;
	}
    
	// TODO: Use static ETag routine if plug-in does NOT server-side render markup

	tRes.message = (VFS.read(tReq.pathname) || {}).contents;
    
	if(tRes.message === undefined) {
		tRes.status = Status.NOT_FOUND;

		return tRes;
	}

	tRes.headers.set("ETag", computeETag(tRes.message));
	
	// Apply static file routine for read
	tRes = handleStatic(tRes, tReq.pathname);

	// Integrate plug-in reference accordingly
	const isCompound = false;

	const pluginIntegrationSequence = retrieveIntegrationPluginNames(isCompound);

	// TODO: What about manually integrated compound only plug-ins? Allow for mutual usage?

	tRes.message = injectPluginReferenceIntoMarkup(tRes.message, pluginIntegrationSequence);

	// TODO: Provide alternative way for manual plug-in integration (e.g. via @directive)?
	// TODO: Write statically prepared dynamic file back to VFS for better performance?

	// Rendering
	
	return tRes;
}


// TODO: Compound
// • retrieve loc
// • inject base tag (head bottom)

function handleDynamicError(): IThreadRes {
	return {} as IThreadRes;
}


// HELPERS

function injectPluginReferenceIntoMarkup(markup: string, effectivePluginNames: Set<string>) {
	const headMatch: Record<string, string[]> = {
		open: markup.match(/<\s*head((?!>)(\s|.))*>/),
		close: markup.match(/<\s*\/head((?!>)(\s|.))*>/)
	};

	if(!headMatch.open || !headMatch.close) {
		// TODO: Create head tag?
		return markup;
	}

	const headPos: Record<string, number> = {
		open: markup.indexOf(headMatch.open[0]) + headMatch.open[0].length,
		close: markup.indexOf(headMatch.close[0])
	};

	const manuallyIntegratedPluginNames: string[] = markup
		.slice(headPos.open, headPos.close)
		.match(new RegExp(`<[ ]*script\\s*src\\s*=\\s*("|')[ ]*(${pluginReferenceSourceRegexStr})[ ]*\\1\\s*>\\s*<[ ]*/[ ]*script\\s*>`, "gi")) || []
		.map((script: string) => {
			return script
				.split(config.pluginRequestPrefix, 2)[1]
				.split(/("|')/, 2)[0]
				.split(new RegExp(`\\${config.pluginRequestSeparator}`, "g"));
		})
		.flat();

	const toBeIntegratedPluginNames: string[] = [...effectivePluginNames]
		.filter((name: string) => !manuallyIntegratedPluginNames.includes(name));

	// Load core application module first as is required (via plug-in module routine)
	toBeIntegratedPluginNames.unshift(config.coreIdentifier);

	// Retrieve top index offset (before first hardcoded script tag)
	// Tags located on top of head are to be kept in place before (could be important e.g. for meta tags)
	const injectionIndex: number = headPos.open + markup
		.slice(headPos.open, headPos.close)
		.search(/.<\s*script(\s|>)/) + 1;

	const injectionSequence = `<script src="/${config.pluginRequestPrefix}${toBeIntegratedPluginNames.join(config.pluginRequestSeparator)}"></script>\n`;

	return `${markup.slice(0, injectionIndex)}${injectionSequence}${markup.slice(injectionIndex)}`;
}