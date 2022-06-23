
import config from"../src.config.json";

import { readFileSync } from "fs";
import { join, dirname } from "path";

import { IResponse, MODE } from "../../core/core";

import { ICompoundInfo } from "../interfaces";
import { VFS } from "../VFS";
import { substituteMark } from "../util";
import { evalCompoundInfo, retrieveCompoundInfo } from "../entity";
import { retrieveIntegrationPluginNames } from "../plugin/registry";
import { activateRender } from "../plugin/render";

import { EStatus } from "./EStatus";


const pluginReferenceSourceRegexStr: string = `/${config.pluginRequestPrefix}((@[a-z0-9~-][a-z0-9._~-]*/)?[a-z0-9~-][a-z0-9._~-]*(\\${config.pluginRequestSeparator}(@[a-z0-9~-][a-z0-9._~-]*/)?[a-z0-9~-][a-z0-9._~-]*)*)?`;
const wsClientModuleText: string = substituteMark(readFileSync(join(__dirname, "../watch/ws.client.js")), "WS_PORT", config.liveWsPort); // With configured websocket port (mark substitution)

const errorPageMapping: Map<string, string> = new Map();	// TODO: Limit size? Rebuild/associater regularly?


/**
 * Handle a dynamic file (type 2) request.
 * @param {string} pathname Requested pathname
 * @param {core.IResponse} res Thread response object
 * @returns {core.IResponse} Modified thread response object
 */
export default function handleDynamic(pathname: string, res: IResponse): IResponse {   // TODO: Store req/res globally?	
    res.cacheable = false;  // TODO: Eval whtther is cacheable (consider rendering!)

    const compoundInfo: ICompoundInfo = retrieveCompoundInfo();

    // Construct project (web file) local path representation (possibly (re-)add default names)
	const filePath = `${compoundInfo
		? compoundInfo.base
		: pathname.replace(/\/$/, `/${config.indexPageName}`)
	}.${config.dynamicFileExtension}`;

	if(!VFS.exists(filePath)) {
		return handleDynamicError(pathname, res, EStatus.NOT_FOUND);
	}

    res.message = VFS.read(filePath);

	// Perform implicit, static page modifications and write back to VFS to keep constant effort (once for each file identity)
    let fileWasModified: boolean = VFS.wasModified(filePath);
	if(!fileWasModified) {
		// Ensure head tag exists for following injections
		// TODO: Improve injection steps / routine
		res.message = embedHead(res.message);

		// Integrate plug-in reference accordingly	
		const pluginIntegrationSequence = retrieveIntegrationPluginNames(!!compoundInfo);
		// TODO: What about manually integrated compound only plug-ins? Allow for mutual usage?
		res.message = injectPluginReferenceIntoMarkup(res.message, pluginIntegrationSequence);

		// Inject compound base tag (in order to keep relative references in markup alive)
		res.message = compoundInfo
			? injectCompoundBaseIntoMarkup(res.message, pathname.slice(0, -(compoundInfo.args.join("/").length)))
			: res.message;

		// Inject live ws client module script if environment is in DEV MODE
		res.message = MODE.DEV
			? injectLiveWsClientModuleIntoMarkup(res.message)
			: res.message;

		// TODO: Provide alternative way for manual plug-in integration (e.g. via @directive)?

		// Apply static renders (once, with writeback)
		res.message = activateRender(res.message, true);
	}
	
	// Write statically prepared dynamic file back to VFS for better performance (plug-in references and renders)
	VFS.modifyExistingFile(filePath, res.message);

	// Apply dynamic renders (for each request individually; possibly client individual)
	res.message = activateRender(res.message, false);
	
    return res;
}

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
	referencePluginNames.unshift(config.appClientModuleName);

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

function handleDynamicError(pathname: string, res: IResponse, status: number): IResponse {
	res.status = status;

	let errorPagePath: string;

	if(errorPageMapping.has(pathname)) {
		errorPagePath = errorPageMapping.get(pathname);

		if(VFS.exists(errorPagePath)) {
			return handleDynamic(errorPagePath, res);
		} else {
			return res;
		}
	}

	pathname = pathname.replace(/\/$/, "/_");	// Prevent empty word request to be striped
	while(pathname !== "/") {
		pathname = dirname(pathname);

		errorPagePath = `${pathname}/${status}`;

		let currentCompoundInfo: ICompoundInfo;

		if(!VFS.exists(`${errorPagePath}.${config.dynamicFileExtension}`)) {
			// TODO: Allow compound error pages?
			evalCompoundInfo(errorPagePath, true);
			currentCompoundInfo = retrieveCompoundInfo();
			
			if(!currentCompoundInfo) {
				continue;
			}
		}

		errorPageMapping.set(pathname, errorPagePath);

		return handleDynamic(errorPagePath, res);
	}

	errorPageMapping.set(pathname, null);

    return res;
}


function injectLiveWsClientModuleIntoMarkup(markup: string): string {
	return injectIntoMarkupHead(markup, `<script>\n${wsClientModuleText}\n</script>`);
}