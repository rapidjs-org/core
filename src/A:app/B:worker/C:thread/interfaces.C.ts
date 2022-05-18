
export interface ICompoundInfo {
	base: string;
	args: string[];
}

export interface IRequestInfo {
    auth: string;
    cookies: Map<string, string>;
    ip: string;
    pathname: string;
    searchParams: URLSearchParams;
    subdomain: string|string[];

    isCompound?: boolean;
}

export interface IEndpointOptions {
	name?: string;
	useCache?: boolean;
}

export interface IEndpointHandlerResult {
	status: number;

	data?: unknown;
}

export interface IFileStamp {
    contents: string,
    eTag: string,

    modified?: boolean;
}

export type TEndpointHandler = (body: TObject, req: IRequestInfo) => unknown;