

import config from "../app.config.json";

import http from "http";

import { mergeObj } from "../../util";

import { PROJECT_CONFIG } from "../config/config.project";
import { IS_SECURE } from "../secure";

import { Status } from "./Status";
import { HeadersMap } from "./HeadersMap";
import { IThreadRes } from "./interfaces.B";


export function respond(eRes: http.ServerResponse, param: number|IThreadRes) {
	if(!eRes) {
		return;
	}

	const tRes: IThreadRes = (param instanceof Number || typeof(param) === "number")
		? {
			status: param,
			headers: new HeadersMap()
		} as unknown as IThreadRes	// Status code overload
		: param;					// Response object overload
	
	tRes.status = tRes.status || Status.SUCCESS;

	// Common headers
	tRes.headers.set("Cache-Control", PROJECT_CONFIG.read("cache", "client").number ? `public, max-age=${PROJECT_CONFIG.read("cache", "client").number}, must-revalidate` : null);
	tRes.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
	tRes.headers.set("Strict-Transport-Security", IS_SECURE ? `max-age=${PROJECT_CONFIG.read("cachingDuration", "client")}; includeSubDomains` : null);
	tRes.headers.set("X-XSS-Protection", "1; mode=block");
	
	tRes.message = !Buffer.isBuffer(tRes.message)
		? Buffer.from(tRes.message || http.STATUS_CODES[tRes.status], "utf-8")
		: tRes.message;
	
	tRes.headers.set("Content-Length", Buffer.byteLength(tRes.message, "utf-8"));
	
	// Write modified cookies to header
	/* const cookiesArray: string[] = [];
	tRes.cookies.forEach((modCookie: IModCookie, name: string) => {
		// TODO:  ; path=${}
		cookiesArray.push(`${name}=${modCookie.value}; ${modCookie.maxAge ? `; Max-Age=${modCookie.maxAge}` : ""}${IS_SECURE ? "; SameSite=Strict; Secure; HttpOnly" : ""}`);
	});
	tRes.headers.set("Set-Cookie", cookiesArray.join()); */
	
	// Write headers to response
	// Add optional and custom headers with process internal added headers having overriding existence
	const finalHeadersObj: TObject = mergeObj({
		"Server": config.appIdentifier
	},
	PROJECT_CONFIG.read("customHeaders").object,
	Object.fromEntries(tRes.headers)
	);
	for(const header in finalHeadersObj) {
		const value: string|number = finalHeadersObj[header] as string|number;
		(value !== undefined && value !== null)
		&& eRes.setHeader(header, value);
	}

	eRes.statusCode = tRes.status;    // TODO: Concealing error status
	
	eRes.end(tRes.headersOnly
		? null
		: tRes.message);
}

export function redirect(eRes: http.ServerResponse, location: string) {
	respond(eRes, {
		status: Status.REDIRECT,
		headers: new HeadersMap({
			"Location": location
		})
	} as IThreadRes);
}