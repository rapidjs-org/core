
const config = {
	...require("../../app.config.json"),

	compoundPageIndicator: "#"
};


import { extname } from "path";

import { PROJECT_CONFIG } from "../../config/config.project";

import { VFS } from "./vfs";
import tlds from "./static/tlds.json";


const registeredMostSignificantParts: string[] = [];
const configuredHostname: string = PROJECT_CONFIG.read("hostname").string;
registeredMostSignificantParts.push(configuredHostname ? `.${configuredHostname}` : "localhost");

// Known subdomain patterns for instant look up
const knownSubdomainPatterns: Map<string, string|string[]> = new Map();

let currentRequestInfo: IRequestInfo;
let currentCompoundInfo: ICompoundInfo;


/**
 * Parse top and second level domain from hostname.
 * @param {string} hostname Full hostname
 * @returns {string} Most significant part
 */
function parseMostSignificantHostnamePart(hostname: string): string {
	// Only parse against TLDs at most once each hostname (time cost efficiency)
	// Stripe TLD parts as long as right-to-left concatenation is valid
	let tld = "";
	let part: string[];
	while(part = hostname.match(/\.[a-z0-9-]+$/i)) {
		if(!tlds.includes(`${part[0].slice(1)}${tld}`)) {	// TODO: Enhance approach (is time cost intensive)
			break;
		}

		tld = part[0] + tld;

		hostname = hostname.slice(0, -part[0].length);
	}

	// Remove SLD name (or numerical host) to split actual subdomains
	const sld: string = (hostname.match(/(^localhost|\.[a-z][a-z0-9_-]+|[0-9]{1,3}(\.[0-9]{1,3})+)$/i) || [""])[0];

	return sld + tld;
}

// TODO: Improve runtime
function parseSubdomain(hostname: string): string|string[] {
	if(knownSubdomainPatterns.has(hostname)) {
		return knownSubdomainPatterns.get(hostname);
	}

	const resolve = (result: string|string[]) => {
		knownSubdomainPatterns.set(hostname, result);

		return result;
	};

	const matchAgainstMostSignificantPart = (mostSignificantPart: string) => {
		const subdomain: string[] = hostname
			.slice(0, -mostSignificantPart.length)
			.split(/\./g);
		
		return resolve((subdomain.length === 1)
			? subdomain[0] || undefined	// No empty string
			: subdomain);
	};
	
	// Match subdomains against registered most significant URL parts
	registeredMostSignificantParts.forEach((part: string) => {
		const applicableMostSignificantPart: string[] = hostname.match(new RegExp(`${part.replace(/\./g, "\\.")}$`, "i"));
		if(applicableMostSignificantPart) {
			return matchAgainstMostSignificantPart(applicableMostSignificantPart[0]);
		}
	});

	// Parser current (not yet registered) most significant part from requested hostname
	// Optional mandatory (configured) hostname filtering already happens before
	const currentMostSignificantPart: string = parseMostSignificantHostnamePart(hostname);

	registeredMostSignificantParts.push(currentMostSignificantPart);

	return matchAgainstMostSignificantPart(currentMostSignificantPart);
}

function parseCookies(cookiesHeader: string): Map<string, string> {
	const cookiesMap: Map<string, string> = new Map();

	if(!cookiesHeader) {
		return cookiesMap;
	}

	cookiesHeader
		.split(";")
		.filter(cookie => (cookie.length > 0))
		.forEach(cookie => {
			const parts = cookie.split("=");
			cookiesMap.set(parts.shift().trim(), decodeURI(parts.join("=")));
		});

	return cookiesMap;
}

// const compondPageMapping: Map<string, string>;

function parseCompoundInfo(path: string, noTraversal = false): ICompoundInfo {
	const fileExists = (path: string) => {
		return VFS.exists(`${path}.${config.dynamicFileExtension}`);
	};

	let compoundPath: string;

	if(fileExists(`${path.replace(/\/$/i, `/${config.indexPageName}`)}`)) {
		return undefined;
	}

	const args: string[] = [];
	// TODO: Enhance retrieval routine?
	if(/\/$/.test(path)) {
		// No trailing slash on arguments 
		compoundPath = `${path}${config.compoundPageIndicator}${config.indexPageName}/${config.indexPageName}`;
		if(fileExists(compoundPath)) {
			return {
				base: compoundPath,
				args: args
			};
		}

		return undefined;
	}

	path = `${path}/`;
	while(path.length > 0) {
		// Index page
		compoundPath = `${path}${config.compoundPageIndicator}${config.indexPageName}/${config.indexPageName}`;
		if(fileExists(compoundPath)) {
			return {
				base: compoundPath,
				args: args
			};
		}

		if(path.length <= 1) {
			return undefined;
		}
		
		// Specific page
		compoundPath = `${path.slice(0, -1).replace(/\/([^/]+)$/i, `/${config.compoundPageIndicator}$1/$1`)}`;
		if(fileExists(compoundPath)) {
			return {
				base: compoundPath,
				args: args
			};	// TODO: Expose compound page info to user? Provide plug-in specific directory from project root?
		}
		
		if(noTraversal) {
			return undefined;
		}

		const arg: string = (path.match(/[^/]+\/+$/i) || [""])[0];
		path = path.slice(0, -arg.length);
		args.unshift(arg.slice(0, -1));
	}

	return undefined;
}	// Information is both dynamic page as well as plug-in endpoint relevant


export function evalRequestInfo(tReq: IThreadReq) {
	if(extname(tReq.pathname).length !== 0) {
		// Do not construct / compute info if is not a page related request (dynamic asset, plug-in endpoint)
		return;
	}

	currentRequestInfo = {
		auth: tReq.headers.get("Authorization"),
		cookies: parseCookies(tReq.headers.get("Cookie")),
		ip: tReq.ip,
		pathname: tReq.pathname,
		searchParams: tReq.searchParams,
		subdomain: parseSubdomain(tReq.hostname)
	};

	updateCompoundInfo(tReq.pathname);
}

export function updateCompoundInfo(path: string, noTraversal?: boolean) {
	currentCompoundInfo = parseCompoundInfo(path, noTraversal);
	
	currentRequestInfo.isCompound = !!currentCompoundInfo;
}


export function retrieveRequestInfo(): IRequestInfo {
	return currentRequestInfo;
}

export function retrieveCompoundInfo(): ICompoundInfo {
	return currentCompoundInfo;
}