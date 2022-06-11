/**
 * Module containing an evaluation and retrieval interface for request 
 * individual information. Information to be evaulated (once) for each
 * at a given entry point and retrieved when in an arbitrary context.
 */


import config from "./src.config.json";

import { IRequest } from "../core/core";

import { IEntityInfo, ICompoundInfo } from "./interfaces";
import { VFS } from "./VFS";


// Store currently effective entity information (thread activation singleton)
let effectiveCompoundInfo: ICompoundInfo;
let effectiveEntity: IEntityInfo;


// TODO: Compound mapping (along with error page mapping; specific cache type?)
// TODO: Boost traversal/parsing effciency with cache/mapping mechanism(s)?
function parseCompoundInfo(path: string, noTraversal: boolean = false) {
    const fileExists = (path: string) => {
		return VFS.exists(`${path}.${config.dynamicFileExtension}`);
	};

	if(fileExists(`${path.replace(/\/$/i, `/${config.indexPageName}`)}`)) {
		return undefined;
	}

	let compoundPath: string;
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
}


export function evalCompoundInfo(path: string, noTraversal?: boolean) {
	effectiveCompoundInfo = parseCompoundInfo(path, noTraversal);
}

export function evalEntityInfo(req: IRequest) {
	evalCompoundInfo(req.url.pathname);

    effectiveEntity = {
        auth: null,
        cookies: null,
        ip: null,
        pathname: null,
        searchParams: null,
        subdomain: null,
        isCompound: !!retrieveCompoundInfo()
    };
}

export function retrieveCompoundInfo(): ICompoundInfo {
    return effectiveCompoundInfo;
}

export function retrieveEntityInfo(): IEntityInfo {
    return effectiveEntity;
}