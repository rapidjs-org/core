/**
 * Reusable/module overlapping interface declarations.
 */


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
    muteRendering?: boolean;
    muteEndpoints?: boolean;
}

export interface IEndpointHandlerResult {
	status: number;

	data?: unknown;
}