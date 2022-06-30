/**
 * Module containing a contextually related response interface for the
 * current request handler.
 * Manually terminate concurrent handler routine in order to prevent
 * obsolete or repeated response manipulation.
 * Maintains the global static response cache, which is effective to
 * accordingly attributed thread response objects.
 */


import config from "../../src.config.json";

import { normalize as normalizePath } from "path";
import { gzipSync, deflateSync } from "zlib";
import { ServerResponse, STATUS_CODES } from "http";

import { Config } from "../../config/Config";
import { Cache } from"../../Cache";
import { mergeObj } from "../../util";
import { MODE } from "../../MODE";
import { IS_SECURE } from "../../IS_SECURE";

import { POOL_SIZE } from "../POOL_SIZE";

import { IContext, IResponse } from "../../interfaces";
import { EStatus } from "./EStatus";
import { CookiesMap } from "./CookiesMap";
import { HeadersMap } from "./HeadersMap";


interface IOpenRes {
	oRes: ServerResponse;
	url: string;
	encode: string;
	headersOnly: boolean;
}


// Static cache for globally cacheable resources
const staticCache: Cache<number|IResponse> = new Cache(null, normalizePath);

// Currently open responses for hooking async processing routines via request ID
const openResponses: Map<number, IOpenRes> = new Map();
const totalReqLoadLimit: number = Math.min(POOL_SIZE * Config["project"].read("limit", "pendingRequests").number, MODE.DEV ? 1000 : Number.MAX_SAFE_INTEGER);	// For annular response ID retrieval (no incremental out of range)
let curResId: number = 0;

/**
 * Hook response context for eventual (async) closing directive via response ID.
 * @param {ServerResponse} oRes Original response object for closing a request accordingly
 * @param {string} url Request URL for caching purposes (non-ambivalent; pathname)
 * @param {string} encode Accepted encoding type of response {ø, gzip, deflate}
 * @param {boolean} headersOnly Whether to send headers only (HEAD verb request)
 * @returns {number} Associated response ID
 */
export function hookResponseContext(oRes: ServerResponse, url: string, encode: string, headersOnly: boolean) {
	curResId = ++curResId % totalReqLoadLimit;	// Annular retrieval

	openResponses.set(curResId, {
		encode, headersOnly, oRes, url
	})

	return curResId;
}

/**
 * Respond with status code or thread response object (overload).
 * @param {number|IResponse} param Status code or thread response object
 * @param {number} [resId] ID of associated open response (Uses current/last issued ID by defaqult as assuming a sync context)
 */
export async function respond(param: number|IResponse|unknown, resId: number = curResId) {
	// TODP: Static cache: Store entire response (except for individual headers)?
	const context: IContext = openResponses.get(resId);

	// Resolve overload	
	const tRes: IResponse = (param instanceof Number || typeof(param) === "number")
	? {
		status: Number(param)
	}
	: param;
	
	tRes.status = tRes.status || EStatus.SUCCESS;

	// Common headers
	tRes.headers = tRes.headers || new HeadersMap();

	tRes.headers.set("Cache-Control", Config["project"].read("cache", "client").number ? `public, max-age=${Config["project"].read("cache", "client").number}, must-revalidate` : null);
	tRes.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
	tRes.headers.set("Strict-Transport-Security", IS_SECURE ? `max-age=${Config["project"].read("cachingDuration", "client")}; includeSubDomains` : null);
	tRes.headers.set("X-XSS-Protection", "1; mode=block");
	
	tRes.message = tRes.message || STATUS_CODES[tRes.status];
	
	// Compress response message according to accepted encoding
	if(Config["project"].read("enableCompression")
	&& !Buffer.isBuffer(tRes.message)
	&& context.encode) {
		switch(context.encode) {
			case "gzip":
				tRes.message = gzipSync(tRes.message);
				break;
			case "deflate":
				tRes.message = deflateSync(tRes.message);
				break;
		}
		
		tRes.headers.set("Content-Encoding", context.encode);
	}
	
	tRes.message = !Buffer.isBuffer(tRes.message)
	? Buffer.from(tRes.message, "utf-8")
	: tRes.message;

	tRes.headers.set("Content-Length", Buffer.byteLength(tRes.message || "", "utf-8"));

	// Write modified cookies to header
	tRes.headers.set("Set-Cookie", CookiesMap.from(tRes.cookies).stringify());	// Re-objectify cookies map (lost on IPC)
	
	// Write headers to response
	// Add optional and custom headers with process internal headers overrides
	const finalHeadersObj: TObject = mergeObj({
		"Server": config.appIdentifier
	}, Config["project"].read("customHeaders").object, Object.fromEntries(tRes.headers));

	for(const name in finalHeadersObj) {
		const value: string|number = finalHeadersObj[name] as string|number;
		(value !== undefined && value !== null)
		&& context.oRes.setHeader(name, value);
	}
	
	context.oRes.statusCode = tRes.status;    // TODO: Concealing error status? Mind message, too!
	
	context.oRes.end(context.headersOnly
	? null
	: tRes.message);

	(tRes.cacheable !== false)	// Cache by default
	&& staticCache.write(context.url, param);
}

/**
 * Respond from cache iff the current context URL exists as an entry.
 * Return positively if cache has been successfully activated in order
 * to stop the normal processing routine.
 */
export function respondFromCache(url: string): boolean {
	url = normalizePath(url);

	if(!staticCache.has(url)) {
		return false;
	}

	respond(staticCache.read(url));

	return true;
}