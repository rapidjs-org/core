
const config = {
	...require("../../../app.config.json"),

	pluginRequestPrefix: "plug-in::",
	pluginRequestSeparator: "+",
	privateWebFilePrefix: "_"
};


import { readFileSync } from "fs";
import { join, extname } from "path";
import { gzipSync, deflateSync } from "zlib";

import { PROJECT_CONFIG } from "../../../config/config.project";

import { Status } from "../../Status";

import { VFS } from "../vfs";
import { computeETag } from "../util";
import { retrieveCompoundInfo } from "../request-info";
import { retireveClientModuleScript, retrieveIntegrationPluginNames } from "../plugin/registry";


const pluginReferenceSourceRegexStr = `/${config.pluginRequestPrefix}((@[a-z0-9~-][a-z0-9._~-]*/)?[a-z0-9~-][a-z0-9._~-]*(\\${config.pluginRequestSeparator}(@[a-z0-9~-][a-z0-9._~-]*/)?[a-z0-9~-][a-z0-9._~-]*)*)?`;

const coreModuleText = String(readFileSync(join(__dirname, "../plugin/client.core.js")));


export default function(tReq: IThreadReq, tRes: IThreadRes): IThreadRes {
	// Retrieve type of asset request to apply respective sub-routine
	if((new RegExp(`^${pluginReferenceSourceRegexStr}$`, "i")).test(tReq.pathname)) {
		// Plug-in module request
		tRes = handlePlugin(tRes, tReq.pathname);

		tRes.headers.set("Content-Type", "text/javascript");

		return tRes;
	}

	// Private file request
	if((new RegExp(`/${config.privateWebFilePrefix}`)).test(tReq.pathname)) {
		tRes.status = Status.FORBIDDEN;	// TODO: Status conceal option?
		
		return tRes;
	}

	const extension: string = extname(tReq.pathname).replace(/^\./, "");	// Case sensitivity for dynamic file extension?

	// Handle request accordingly
	tRes = (extension.length > 0)
		? handleStatic(tRes, tReq.pathname)	// Static file (any file that is not a .HTML file (system web page type))
		: handleDynamic(tRes, tReq);		// Dynamic file

	if(tRes.status && tRes.status !== Status.SUCCESS) {
		return tRes;
	}
	
	const mime: string = PROJECT_CONFIG.read("mimes", extension || config.dynamicFileExtension).string;
	if(mime) {
		tRes.headers.set("Content-Type", mime);
		tRes.headers.set("X-Content-Type-Options", "nosniff");
	}

	// TODO: Fix headers interface scope transmission

	// Compare match with ETag in order to communicate possible cache usage 
	if(tRes.headers.get("ETag")
    && tReq.headers.get("If-None-Match") == tRes.headers.get("ETag")) {
		tRes.status = Status.USE_CACHE;

		return tRes;    // TODO: Respond shorthand?
	}

	// Apply compression if accepted
	const checkCompressionAccepted = (compressionType: string) => {
		return tReq.headers.get("Accept-Encoding").match(new RegExp(`(^|,[ ]*)${compressionType}($|[a-z0-9-])`, "i"));
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
	const compoundInfo: ICompoundInfo = retrieveCompoundInfo();

	// TODO: Error routine
	// TODO: How to handle generic error routine?
	
	// TODO: Use static ETag routine if plug-in does NOT server-side render markup
	const fileStamp = VFS.read(`${compoundInfo ? compoundInfo.base : tReq.pathname.replace(/\/$/, `/${config.indexPageName}`)}.${config.dynamicFileExtension}`);
	if(fileStamp === undefined) {
		tRes.status = Status.NOT_FOUND;

		return tRes;
	}

	// Ensure head tag exists for following injections
	tRes.message = embedHead(fileStamp.contents);

	// Integrate plug-in reference accordingly	
	const pluginIntegrationSequence = retrieveIntegrationPluginNames(!!compoundInfo);
	// TODO: What about manually integrated compound only plug-ins? Allow for mutual usage?
	tRes.message = injectPluginReferenceIntoMarkup(tRes.message, pluginIntegrationSequence);

	// Inject compound base tag (in order to keep relative references in markup alive)
	tRes.message = compoundInfo
		? injectCompoundBaseIntoMarkup(tRes.message, tReq.pathname.slice(0, -(compoundInfo.args.join("/").length)))
		: tRes.message;

	// TODO: Provide alternative way for manual plug-in integration (e.g. via @directive)?
	// TODO: Write statically prepared dynamic file back to VFS for better performance?

	// Rendering
	// TODO: Implement

	tRes.headers.set("ETag", computeETag(tRes.message));
	
	return tRes;
}

// TOD: Error page request association map?

function handleDynamicError(tRes: IThreadRes, ): IThreadRes {
	return {} as IThreadRes;
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
	const headInjectionPos: number = (htmlTagPos ? markup.indexOf(htmlTagPos[0]) : 0) + (htmlTagPos[0] || [""]).length;

	return `${markup.slice(0, headInjectionPos)}\n<head></head>\n${markup.slice(headInjectionPos)}`;
}

function injectPluginReferenceIntoMarkup(markup: string, effectivePluginNames: Set<string>): string {
	const headPos = getHeadPosition(markup);

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

function injectCompoundBaseIntoMarkup(markup: string, basePath: string): string {
	const headPos = getHeadPosition(markup);

	return `${markup.slice(0, headPos.open)}\n<base href="${basePath}">${markup.slice(headPos.open)}`;
}