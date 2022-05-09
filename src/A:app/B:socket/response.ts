
import http from "http";

import { PROJECT_CONFIG } from "../config/config.project";
import { IS_SECURE } from "../secure";

import { Status } from "./Status";
import { HeadersMap } from "./HeadersMap";
import { IThreadRes } from "./interfaces.thread";


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

	// Common headers
	tRes.headers.set("Cache-Control", PROJECT_CONFIG.read("cache", "client").object ? `public, max-age=${PROJECT_CONFIG.read("cache", "client").number}, must-revalidate` : null);
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

	tRes.headers
		.forEach((value: string, header: string) => {
			if(value === undefined || value === null) {
				return;
			}

			eRes.setHeader(header, value);
		});

	eRes.statusCode = tRes.status || Status.SUCCESS;    // TODO: Concealing error status
	
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