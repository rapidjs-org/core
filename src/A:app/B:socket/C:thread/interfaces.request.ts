
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

export type TEndpointHandler = (body: TObject, req: IRequestInfo) => unknown;