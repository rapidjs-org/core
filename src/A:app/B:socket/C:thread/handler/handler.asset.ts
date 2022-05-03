
const config = {
	pluginRequestPrefix: "plug-in::",
	pluginRequestSeparator: "+",
	privateWebFilePrefix: "_"
};


import { extname } from "path";

import { MODE } from "../../../mode";

import { Status } from "../../Status";

import { VFS } from "../vfs";
import { parseSubdomain, computeETag } from "../util";
import { retireveClientModuleScript, retrieveIntegrationPluginNames } from "../plugin/registry";


export default function(tReq: IThreadReq, tRes: IThreadRes): IThreadRes {
	// Retrieve type of asset request to apply respective sub-routine
	if((new RegExp(`^/${config.pluginRequestPrefix}((@[a-z0-9~-][a-z0-9._~-]*/)?[a-z0-9~-][a-z0-9._~-]*(\\${config.pluginRequestSeparator}(@[a-z0-9~-][a-z0-9._~-]*/)?[a-z0-9~-][a-z0-9._~-]*)*)?$`, "i")).test(tReq.pathname)) {
		// Plug-in module request
		tRes = handlePlugin(tRes, tReq.pathname);
	} else if(extname(tReq.pathname).length > 0) {
		// Static file (any file that is not a .HTML file (system web page type))
		tRes = handleStatic(tRes, tReq.pathname);
	} else {
		// Dynamic file

		// TODO: Redirect explicit
		tRes = handleDynamic(tRes, tReq);
	}

	if(tRes.status !== Status.NOT_FOUND) {
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
	const requestedPluginNames = path.slice(config.pluginRequestPrefix.length + 1).split(new RegExp(`\\${config.pluginRequestSeparator}`, "g"));

	if(requestedPluginNames.length === 0) {
		tRes.status = Status.NOT_ACCEPTABLE;

		return tRes;
	}
		
	let cumulatedClientModuleScripts: string = "";
	Array.from(new Set(requestedPluginNames))	// Eliminate duplicate names
	.forEach((name: string) => {
		const clientModuleScriptText: string = retireveClientModuleScript(name);

		clientModuleScriptText
		? cumulatedClientModuleScripts += clientModuleScriptText
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

	// TODO: Error routine
	// TODO: How to handle generic error routine?
	
	if((new RegExp(`/${config.privateWebFilePrefix}`)).test(tReq.pathname)) {
		tRes.status = Status.FORBIDDEN;
		
		return tRes;
	}
    
	// TODO: Use static ETag routine if plug-in do NOT server-side render markup

	tRes.message = (VFS.read(tReq.pathname) || {}).contents;
    
	if(tRes.message === undefined) {
		tRes.status = Status.NOT_FOUND;

		return tRes;
	}

	tRes.headers.set("ETag", computeETag(tRes.message));
	
	// Apply static file routine for read
	tRes = handleStatic(tRes, tReq.pathname);

	// Integrate plug-in saccordingly
	const isCompound = false;

	const pluginIntegrationSequence = retrieveIntegrationPluginNames(isCompound).join(config.pluginRequestSeparator);
	console.log(pluginIntegrationSequence);
}

function handleDynamicError(): IThreadRes {
	return {} as IThreadRes;
}