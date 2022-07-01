/**
 * Module containing an evaluation and retrieval interface for request 
 * individual information. Information to be evaulated (once) for each
 * at a given entry point and retrieved when in an arbitrary context.
 */


const config = {
	...require("./src.config.json"),

	localeAnyValue: "any",
	localeDefaultStrategyImplicit: "implicit",
	localeDefaultStrategyNone: "none",
	localeDefaultStrategyRedirect: "redirect"
};

import { IRequest, Config, util } from "../core/core";

import tlds from "./tlds.json";
import { IEntityInfo, ICompoundInfo } from "./interfaces";
import { VFS } from "./VFS";


interface IParsedLocale {
	country?: string;
	language?: string;
	updatedSequence?: string;
}


const localeConfig = {
	defaultStrategy: Config["project"].read("locale", "defaultStrategy").string,
	supported: Config["project"].read("locale", "supported").object,
	useSubdomain: Config["project"].read("locale", "useSubdomain").boolean
};

// Store currently effective entity information (thread activation singleton)
let parsedInfo: {
	subdomain: string|string[];
	locale: IParsedLocale;
	updatedPathname: string;

	redirectLocaleUrl?: string;
};
let effectiveCompoundInfo: ICompoundInfo;
let effectiveEntity: IEntityInfo;


// TODO: Always fetch generic single part TLD and only match multi part TLDs against existence in map
const registeredMostSignificantParts: string[] = [];
registeredMostSignificantParts.push("localhost");

// Known subdomain patterns for instant look up
const knownSubdomainPatterns: Map<string, THeaderValue> = new Map();

function parseLocale(sequence: string = ""): IParsedLocale {
	// Locale disabled (not configured) 
	if(!localeConfig.supported) {
		return;
	}

	/**
	 * Locale config:
	 * 
	 * "locale": {
	 *     "defaultStrategy": { "implicit", "redirect", "none" },
	 *     "supported": {
	 *         "en": [ "GB", "US" ],
	 *         "de": "any"
	 *     },
	 *     "useSubdomain": boolean,
	 * 	   >> "pattern": ...?
	 * }
	 * 
	 * See module config obj for actual values.
	 */

    // Match locale information to update internal URL representation
	const match: string[] = sequence.match(/^\/((([a-z]{2})(\-([A-Z]{2})?))|([A-Z]{2}))\//);
	
	if(!match) {
		return;
	}

	const country: string = match[5] || match[6];
	const language: string = match[3];

	// No valid locale coding found
	if(language && !Array.isArray(localeConfig.supported[language])
	|| country && !localeConfig.supported[!language
	? config.localeAnyValue
	: language].includes(country)) {
		// Default strategy
		switch(localeConfig.defaultStrategy) {
			case config.localeDefaultStrategyNone:
				
				break;
		}

		return;
	}


	// TODO: Accept lang header?

	return {
		country,
		language,
		updatedSequence: sequence.slice(match[0].length - 1)
	}
}

// TODO: Improve runtime
function parseSubdomain(hostname: string): THeaderValue {
	if(knownSubdomainPatterns.has(hostname)) {
		return knownSubdomainPatterns.get(hostname);
	}

	const resolve = (result: THeaderValue) => {
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

	const currentMostSignificantPart: string = sld + tld;

	registeredMostSignificantParts.push(currentMostSignificantPart);

	return matchAgainstMostSignificantPart(currentMostSignificantPart);
}

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


export function parseInfo(req: IRequest) {
	const parsedSubdomain: string|string[] = localeConfig.useSubdomain
	? parseSubdomain(req.url.hostname)
	: null;
	const parsedLocale: IParsedLocale = parseLocale(localeConfig.useSubdomain
	? ((util.arrayify(parsedSubdomain) || []) as string[])[0]
	: req.url.pathname) || {};
	const updatedPathname: string = (!localeConfig.useSubdomain ? parsedLocale.updatedSequence : null) || req.url.pathname;

	parsedInfo = {
		locale: parsedLocale,
		subdomain: parsedSubdomain,
		updatedPathname: updatedPathname
	};
	
	return updatedPathname;
}

export function evalCompoundInfo(path: string, noTraversal?: boolean) {
	effectiveCompoundInfo = parseCompoundInfo(path, noTraversal);
}

export function evalEntityInfo(req: IRequest) {
	evalCompoundInfo(req.url.pathname);

    effectiveEntity = {
        auth: req.headers.get("Authorization"),
        cookies: null,	// TODO: Allow for manipulation
        ip: req.ip,
		locale: {
			country: parsedInfo.locale.country,
			language: parsedInfo.locale.language
	 	},
        pathname: parsedInfo.updatedPathname,	// TODO: Only if not from subdomain
        searchParams: req.url.searchParams,
        subdomain: parsedInfo.subdomain || parseSubdomain(req.url.hostname),
        isCompound: !!retrieveCompoundInfo()
    };
}

export function retrieveCompoundInfo(): ICompoundInfo {
    return effectiveCompoundInfo;
}

export function retrieveEntityInfo(): IEntityInfo {
    return effectiveEntity;
}