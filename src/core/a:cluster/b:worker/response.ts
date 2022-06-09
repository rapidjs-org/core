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
import { STATUS_CODES } from "http";

import { Config } from "../../config/Config";
import { mergeObj } from "../../util";

import { IS_SECURE } from "../IS_SECURE";

import { IContext, IResponse } from "./interfaces";
import { EStatus } from "./EStatus";
import { Cache } from"./Cache";
import { HeadersMap } from "./HeadersMap";
import { getContext } from "./context-hook";


const staticCache: Cache<number|IResponse> = new Cache(null, normalizePath);


/**
 * Respond with status code or thread response object (overload).
 * @param {number|IResponse} param Status code or thread response object
 */
export function respond(param: number|IResponse, asyncId?: number) {
	// TODP: Static cache: Store entire response (except for individual headers)?

	const context: IContext = getContext(asyncId);

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
	/* const cookiesArray: string[] = [];
	tRes.cookies.forEach((modCookie: IModCookie, name: string) => {
		// TODO:  ; path=${}
		cookiesArray.push(`${name}=${modCookie.value}; ${modCookie.maxAge ? `; Max-Age=${modCookie.maxAge}` : ""}${IS_SECURE ? "; SameSite=Strict; Secure; HttpOnly" : ""}`);
	});
	tRes.headers.set("Set-Cookie", cookiesArray.join()); */
	
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
export function respondFromCache(): boolean {
	const contextUrl: string = getContext().url;

	if(!staticCache.has(contextUrl)) {
		return false;
	}

	respond(staticCache.read(contextUrl));

	return true;
}