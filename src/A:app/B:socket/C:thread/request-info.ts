
const config = {
	...require("../../app.config.json"),

	compoundPageIndicator: "#",
	indexPageName: "index"
};


import { extname } from "path";

import { VFS } from "./vfs";
import tlds from "./static/tlds.json";


let currentRequestInfo: IRequestInfo;
let currentCompoundInfo: ICompoundInfo;


function parseSubdomain(hostname: string): string|string[] {
	// Stripe TLD parts as long as right-to-left concatenation is valid
	let tld = "";
	let part: string[];
	while(part = hostname.match(/\.[a-z0-9-]+$/i)) {
		if(!tlds.includes(`${part[0].slice(1)}${tld}`)) {
			break;
		}

		tld = part[0] + tld;

		hostname = hostname.slice(0, -part[0].length);
	}

	// Remove SLD name (or numerical host) to split actual subdomains
	const subdomain: string[] = hostname
	.replace(/(\.[a-z][a-z0-9_-]+|(\.[0-9]{2,3})+)$/i, "")
	.replace(/^localhost$/, "")
	.split(/\./g);

	return (subdomain.length === 1)
	? subdomain[0] || undefined	// No empty string
	: subdomain;
}

function parseCookies(): Map<string, string|number|boolean> {
	// TODO: Implement
	return new Map();
}

const validPagePaths: string[] = [];	// TODO: Implement (along cache?)

function parseCompoundInfo(path: string): ICompoundInfo {
	// TODO: Explicit index request redirect (to implicit)
	const fileExists = (path: string) => {
		return VFS.exists(`${path}.${config.dynamicFileExtension}`);
	};

	if(fileExists(`${path.replace(/\/$/i, `/${config.indexPageName}`)}`)) {
		return undefined;
	}

	path = path.replace(/(\/)?$/, "/");
	const args: string[] = [];
	while(path.length > 0) {
		// Index page
		let compoundPath: string = `${path}${config.compoundPageIndicator}${config.indexPageName}/${config.indexPageName}`
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

		const arg: string = (path.match(/[^/]+\/+$/i) || [""])[0];
		path = path.slice(0, -arg.length);
		args.unshift(arg.slice(1));
	}

	return undefined;
}	// Information is both dynamic page as well as plug-in endpoint relevant


export function defineRequestInfo(tReq: IThreadReq) {
	if(extname(tReq.pathname).length !== 0) {
		// Do not construct / compute info if is not a page related request (dynamic asset, plug-in endpoint)
		return;
	}

	currentCompoundInfo = parseCompoundInfo(tReq.pathname);

	currentRequestInfo = {
		auth: tReq.headers.get("Authorization"),
		ip: tReq.ip,
		isCompound: !!currentCompoundInfo,
		pathname: tReq.pathname,
		subdomain: parseSubdomain(tReq.hostname)
	};
}

export function retrieveRequestInfo(): IRequestInfo {
	return currentRequestInfo;
}

export function retrieveCompoundInfo(): ICompoundInfo {
	return currentCompoundInfo;
}