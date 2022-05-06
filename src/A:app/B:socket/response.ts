
import http from "http";

import { PROJECT_CONFIG } from "../config/config.project";
import { IS_SECURE } from "../secure";

import { Status } from "./Status";
import { HeadersMap } from "./HeadersMap";


export function respond(eRes: http.ServerResponse, param: number|IThreadRes) {
	if(!eRes) {
		return;
	}

	let tRes: IThreadRes;
	tRes = (param instanceof Number || typeof(param) === "number")
	? {
		status: tRes,
		headers: new HeadersMap()
	} as unknown as IThreadRes	// Status code overload
	: param;					// Response object overload

	const messageBuffer: Buffer = Buffer.from(tRes.message ? tRes.message : http.STATUS_CODES[tRes.status], "utf-8");

	// Common headers
	tRes.headers.set("Cache-Control", PROJECT_CONFIG.read("cache", "client").object ? `public, max-age=${PROJECT_CONFIG.read("cache", "client").number}, must-revalidate` : null);
	tRes.headers.set("Content-Length", Buffer.byteLength(messageBuffer, "utf-8"));
	tRes.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
	tRes.headers.set("Strict-Transport-Security", IS_SECURE ? `max-age=${PROJECT_CONFIG.read("cachingDuration", "client")}; includeSubDomains` : null);
	tRes.headers.set("X-XSS-Protection", "1; mode=block");

	// Additional headers set from handler
	tRes.headers
		.forEach((value: string, header: string) => {
			if(value === undefined || value === null) {
				return;
			}

			eRes.setHeader(header, value);
		});

	eRes.statusCode = tRes.status || Status.SUCCESS;    // TODO: Concealing error status

	eRes.end(messageBuffer);
}

export function redirect(eRes: http.ServerResponse, location: string) {
	respond(eRes, {
		status: Status.REDIRECT,
		headers: new HeadersMap({
			"Location": location
		})
	} as IThreadRes);
}