
const config = {
	...require("../../../app.config.json"),

	pluginRequestPrefix: "plug-in::",
	pluginRequestSeparator: "+",
	privateWebFilePrefix: "_"
};


import { readFileSync } from "fs";
import { join, extname, dirname } from "path";
import { gzipSync, deflateSync } from "zlib";

import { MODE } from "../../../mode";
import { PROJECT_CONFIG } from "../../../config/config.project";

import { Status } from "../../Status";
import { IThreadReq, IThreadRes } from "../../interfaces.B";

import { VFS } from "../vfs";
import { retrieveCompoundInfo, updateCompoundInfo } from "../request-info";
import { retireveClientModuleScript, retrieveIntegrationPluginNames } from "../plugin/registry";
import { ICompoundInfo, IFileStamp } from "../interfaces.C";


const pluginReferenceSourceRegexStr = `/${config.pluginRequestPrefix}((@[a-z0-9~-][a-z0-9._~-]*/)?[a-z0-9~-][a-z0-9._~-]*(\\${config.pluginRequestSeparator}(@[a-z0-9~-][a-z0-9._~-]*/)?[a-z0-9~-][a-z0-9._~-]*)*)?`;
const coreModuleText = String(readFileSync(join(__dirname, "../plugin/client.core.js")));

const errorPageMapping: Map<string, string> = new Map();	// TODO: Limit size?

const liveWsClientModuleText: string = String(readFileSync(join(__dirname, "../../../live/ws-client.js")))
	.replace(/@WS_PORT/, String(config.liveWsPort));	// With configured websocket port (mark substitution)


enum AssetType {
	PLUGIN,
	STATIC,
	DYNAMIC
}


export default function(tReq: IThreadReq, tRes: IThreadRes): IThreadRes {
	let extension: string = extname(tReq.pathname).replace(/^\./, "");
	const assetType: AssetType = (new RegExp(`^${pluginReferenceSourceRegexStr}$`, "i")).test(tReq.pathname)
		? AssetType.PLUGIN
		: ((extname(tReq.pathname).length === 0)
			? AssetType.DYNAMIC
			: AssetType.STATIC);

	if(assetType === AssetType.PLUGIN) {
		tRes = handlePlugin(tRes, tReq.pathname);

		extension = "js";
	} else {
		if((new RegExp(`/${config.privateWebFilePrefix}`)).test(tReq.pathname)) {
			tRes.status = Status.FORBIDDEN;
		} else {
			tRes = (assetType === AssetType.DYNAMIC)
				? handleDynamic(tRes, tReq.pathname)
				: handleStatic(tRes, tReq.pathname);
		}
	}
	
	tRes = (assetType === AssetType.DYNAMIC
	&& (tRes.status || Status.SUCCESS) !== Status.SUCCESS)	// TODO: Implement conceal error status option
		? handleDynamicError(tRes, tReq.pathname)
		: tRes;
	
	tRes.staticCacheKey = (assetType !== AssetType.DYNAMIC)
	? tReq.pathname
	: null;	// TODO: Move back to pool control module?

	if(tRes.message === undefined) {
		return tRes;
	}

	// Compare match with ETag in order to communicate possible cache usage 
	if(tRes.headers.get("ETag")
    && tReq.headers.get("If-None-Match") === tRes.headers.get("ETag")) {
		tRes.status = Status.USE_CACHE;

		return tRes;
	}
	
	const mime: string = PROJECT_CONFIG.read("mimes", extension || config.dynamicFileExtension).string;
	if(mime) {
		tRes.headers.set("Content-Type", mime);
		tRes.headers.set("X-Content-Type-Options", "nosniff");
	}

	// Apply compression if is accepted
	const checkCompressionAccepted = (compressionType: string) => {
		return (tReq.headers.get("Accept-Encoding") || "").match(new RegExp(`(^|,)[ ]*${compressionType}[ ]*($|,)`, "i"));
	};
	
	if(tReq.headers.has("Accept-Encoding")) {
		if(checkCompressionAccepted("gzip")) {
			tRes.message = gzipSync(tRes.message);

			tRes.headers.set("Content-Encoding", "gzip");
		} else if(checkCompressionAccepted("deflate")) {
			tRes.message = deflateSync(tRes.message);

			tRes.headers.set("Content-Encoding", "deflate");
		}	// TODO: Implement optional weight consideration?
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
	if(!VFS.exists(path)) {
		tRes.status = Status.NOT_FOUND;

		return tRes;
	}

	const fileStamp: IFileStamp = VFS.read(path);

	tRes.message = fileStamp.contents;
	
	tRes.headers.set("ETag", fileStamp.eTag);

	return tRes;
}

function handleDynamic(tRes: IThreadRes, pathname: string): IThreadRes {
	const compoundInfo: ICompoundInfo = retrieveCompoundInfo();

	const filePath = `${compoundInfo
		? compoundInfo.base
		: pathname.replace(/\/$/, `/${config.indexPageName}`)
	}.${config.dynamicFileExtension}`;

	if(!VFS.exists(filePath)) {
		tRes.status = Status.NOT_FOUND;

		return tRes;
	}

	let fileStamp = VFS.read(filePath);

	if(!fileStamp.modified) {
		// Initial (user modified) file read

		// Ensure head tag exists for following injections
		// TODO: Improve injection steps / routine
		tRes.message = embedHead(fileStamp.contents);

		// Integrate plug-in reference accordingly	
		const pluginIntegrationSequence = retrieveIntegrationPluginNames(!!compoundInfo);
		// TODO: What about manually integrated compound only plug-ins? Allow for mutual usage?
		tRes.message = injectPluginReferenceIntoMarkup(tRes.message, pluginIntegrationSequence);

		// Inject compound base tag (in order to keep relative references in markup alive)
		tRes.message = compoundInfo
			? injectCompoundBaseIntoMarkup(tRes.message, pathname.slice(0, -(compoundInfo.args.join("/").length)))
			: tRes.message;

		// Inject live ws client module script if environment is in DEV MODE
		tRes.message = MODE.DEV
		? injectLiveWsClientModuleIntoMarkup(tRes.message)
		: tRes.message;

		// TODO: Provide alternative way for manual plug-in integration (e.g. via @directive)?
		
		// TODO: Write statically prepared dynamic file back to VFS for better performance?
		fileStamp = VFS.modifyExistingFile(filePath, tRes.message);
		
	} else {
		// Backwritten / modified (preprocessed, user untouched) file read
		tRes.message = fileStamp.contents;
	}
	
	tRes.headers.set("ETag", fileStamp.eTag);

	// Rendering (individual request dependant)
	// TODO: Implement
		
	return tRes;
}

// TODO: Error page request association map?
function handleDynamicError(tRes: IThreadRes, pathname: string): IThreadRes {
	let errorPagePath: string;

	if(errorPageMapping.has(pathname)) {
		errorPagePath = errorPageMapping.get(pathname);

		if(VFS.exists(errorPagePath)) {
			return handleDynamic(tRes, errorPagePath);
		}

		errorPageMapping.delete(pathname);
	}

	pathname = pathname.replace(/\/$/, "/_");	// Prevent empty word request to be striped

	while(pathname !== "/") {
		pathname = dirname(pathname);

		errorPagePath = `${pathname}/${tRes.status}`;

		// TODO: Only traverse vfs once (or when changes)!
		updateCompoundInfo(errorPagePath, true);
		const currentCompoundInfo = retrieveCompoundInfo();
		
		// TODO: Allow compound error pages?
		if(currentCompoundInfo || VFS.exists(`${errorPagePath}.${config.dynamicFileExtension}`)) {
			errorPageMapping.set(pathname, errorPagePath);

			return handleDynamic(tRes, errorPagePath);
		}
	}

	return tRes;
}


// HELPERS

function getHeadPosition(markup: string): {
	open: number;
	close: number;
} {
	const headMatch: Record<string, string[]> = {
		open: markup.match(/<\s*head((?!>)(\s|[^>]))*>/),
		close: markup.match(/<\s*\/head((?!>)(\s|[^>]))*>/)
	};

	if(!headMatch.open || !headMatch.close) {
		return null;
	}

	return {
		open: markup.indexOf(headMatch.open[0]) + headMatch.open[0].length,
		close: markup.indexOf(headMatch.close[0])
	};
}

function embedHead(markup: string): string {
	const headPos = getHeadPosition(markup);	// TODO: Improve retrievals?

	if(headPos) {
		return markup;
	}

	const htmlTagPos: string[] = markup.match(/<\s*html((?!>)(\s|[^>]))*>/);
	const headInjectionPos: number = (htmlTagPos ? markup.indexOf(htmlTagPos[0]) : 0) + (htmlTagPos ? htmlTagPos[0] : []).length;
	
	return `${markup.slice(0, headInjectionPos)}\n<head></head>\n${markup.slice(headInjectionPos)}`;
}

function injectIntoMarkupHead(markup: string, injectionSequence: string) {
	const headPos = getHeadPosition(markup);

	// At bottom
	return `${markup.slice(0, headPos.open)}\n${injectionSequence}${markup.slice(headPos.open)}`;
}

function injectPluginReferenceIntoMarkup(markup: string, effectivePluginNames: Set<string>): string {
	const headPos = getHeadPosition(markup);

	// Do not reference manually referenced plug-ins but do not merge due to custom ordering
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

	const referencePluginNames: string[] = [...effectivePluginNames]
		.filter((name: string) => !manuallyIntegratedPluginNames.includes(name));

	// Load core application module first as is required (via plug-in module routine)
	referencePluginNames.unshift(config.coreIdentifier);

	// Retrieve top index offset (before first hardcoded script tag)
	// Tags located on top of head are to be kept in place before (could be important e.g. for meta tags)
	const injectionIndex: number = headPos.open + markup
		.slice(headPos.open, headPos.close)
		.search(/.<\s*script(\s|>)/) + 1;

	const injectionSequence = `<script src="/${config.pluginRequestPrefix}${referencePluginNames.join(config.pluginRequestSeparator)}"></script>\n`;

	return `${markup.slice(0, injectionIndex)}${injectionSequence}${markup.slice(injectionIndex)}`;
}

function injectCompoundBaseIntoMarkup(markup: string, basePath: string): string {
	return injectIntoMarkupHead(markup, `<base href="${basePath}">`);
}

function injectLiveWsClientModuleIntoMarkup(markup: string): string {
	return injectIntoMarkupHead(markup, `<script>\n${liveWsClientModuleText}\n</script>`);
}