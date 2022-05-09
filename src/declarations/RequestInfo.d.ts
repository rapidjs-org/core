
declare interface ICompoundInfo {
	base: string;
	args: string[];
}

declare interface IRequestInfo {
    auth: string;
    cookies: Map<string, string>;
    ip: string;
    pathname: string;
    searchParams: URLSearchParams;
    subdomain: string|string[];

    isCompound?: boolean;
}