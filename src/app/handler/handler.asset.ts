/**
 * Module containing the handler routine for asset requests.
 * Each asset represents exactly one of the following three types:
 *  1. Plug-in client module (file):  A plug-in's client module that is to be requested by a
 *                                   specific URL pathname pattern:
 *                                   /plug-in::<plug-in-name-1>(+<plug-in-name-2>)...(+<plug-in-name-n>)
 *                                   This way multiple plug-in modules can be obtained with
 *                                   just a single request receiving concatenated scripts.
 *  2. Dynamic file:                  A web page document encoding file (*.html). The response
 *                                   data of dynamic files may be influenced by (client or
 *                                   temporaly) individual factors.
 *                                   The applioed caching mechanisms depend on the effective
 *                                   rendering behavior in order to deduct optimal response
 *                                   costs (space and time).
 *  3. Static file:                   Any asset that is not of the above types is considered
 *                                   a static file as its source/data is served unmodified.
 * Files named with an leading underscore (/_*) are considered
 * private and not accessible from the web. Use cases of private
 * files boil down to support files e.g. markup partials.
 */


import config from"../src.config.json";

import { extname } from "path";

import { IRequest, IResponse, Config } from "../../core/core";

import { normalizeExtension } from "../util";

import { EStatus } from "./EStatus";
import { VFS } from "./VFS";


const pluginReferenceSourceRegexStr = `/${config.pluginRequestPrefix}((@[a-z0-9~-][a-z0-9._~-]*/)?[a-z0-9~-][a-z0-9._~-]*(\\${config.pluginRequestSeparator}(@[a-z0-9~-][a-z0-9._~-]*/)?[a-z0-9~-][a-z0-9._~-]*)*)?`;


interface IAppRequest extends IRequest {
    extension?: string;
}


/**
 * Handle asset request accordingly.
 * @param {core.IRequest} req Thread request object
 * @param {core.IResponse} res Thread response object
 * @returns {core.IResponse} Modified thread response object
 */
export default function(req: IRequest, res: IResponse): IResponse {
    const appReq: IAppRequest = { ...req };

    // Plug-in client module request
    if((new RegExp(`^${pluginReferenceSourceRegexStr}$`, "i")).test(appReq.url.pathname)) {
        appReq.extension = "js";

        return handlePluginClientModule(appReq, res);
    }

    // Restrict access to files marked privat using an indicating underscore
    if((new RegExp(`/${config.privateWebFilePrefix}`)).test(appReq.url.pathname)) {
        res.status = EStatus.FORBIDDEN;

        return res;
    }

    appReq.extension = normalizeExtension(extname(req.url.pathname));

    // Redirect extension explicit dynamic asset request to implicit variant
    if(appReq.extension === config.dynamicFileExtension) {
        res.headers.set("Location", `${appReq.url.pathname.replace(new RegExp(`\\.${config.dynamicFileExtension}$`, "i"), "")}${appReq.url.hash ? `#${appReq.url.hash}` : ""}${appReq.url.searchString ? `?${appReq.url.searchString}` : ""}`);
        
        res.status = EStatus.REDIRECT;

        return res;
    }

    // Handle type 2, 3 asset accordingly
    return (appReq.extension.length === 0)
    ? handleDynamic(appReq, res)
    : handleStatic(appReq, res);
}


/**
 * Enrich a thread response object asset generically.
 * @helper
 * @param {IAppRequest} req Thread request object
 * @param {core.IResponse} res Thread response object
 * @returns {core.IResponse} Modified thread response object
 */
function respond(req: IAppRequest, res: IResponse): IResponse {
	// Compare match with ETag in order to communicate possible cache usage 
	if((req.headers.get("If-None-Match") || 1) === (res.headers.get("ETag") || 2)) {
		res.status = EStatus.USE_CACHE;

		return res;
	}
	
	const mime: string = Config["project"].read("mimes", req.extension || config.dynamicFileExtension).string;
	if(mime) {
		res.headers.set("Content-Type", mime);
		res.headers.set("X-Content-Type-Options", "nosniff");
	}

    return res;
}

/**
 * Handle a plug-in client module file (type 1) request.
 * @param {IAppRequest} req Thread request object
 * @param {core.IResponse} res Thread response object
 * @returns {core.IResponse} Modified thread response object
 */
function handlePluginClientModule(req: IAppRequest, res: IResponse): IResponse {
    return respond(req, res);
}

/**
 * Handle a dynamic file (type 2) request.
 * @param {IAppRequest} req Thread request object
 * @param {core.IResponse} res Thread response object
 * @returns {core.IResponse} Modified thread response object
 */
function handleDynamic(req: IAppRequest, res: IResponse): IResponse {
    res.cacheable = false;

    res.message = "ABC";

    return respond(req, res);
}

/**
 * Handle a static file (type 3) request.
 * @param {IAppRequest} req Thread request object
 * @param {core.IResponse} res Thread response object
 * @returns {core.IResponse} Modified thread response object
 */
function handleStatic(req: IAppRequest, res: IResponse): IResponse {
    return respond(req, res);
}