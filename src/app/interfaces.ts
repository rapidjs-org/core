/**
 * Reusable/module overlapping interface declarations.
 */

import { TEndpointHandler } from "./plugin/types";


export interface IEntityInfo {
    auth: THeaderValue;
    cookies: Map<string, string>;
    ip: string;
    isCompound: boolean;
    pathname: string;
    searchParams: TObject;
    subdomain: THeaderValue;
}

export interface ICompoundInfo {
	base: string;
	args: string[];
}

export interface IPluginOptions {
    alias?: string;
    integrateManually?: boolean;
    muteRenders?: boolean;
    muteEndpoints?: boolean;
}

export interface IEndpointHandlerResult {
	status: number;

	data?: unknown;
}

export interface IPluginFeatureData<H> {
	handler: H;
}

export interface IPluginEndpointData extends IPluginFeatureData<TEndpointHandler> {
	cacheable: boolean;
}