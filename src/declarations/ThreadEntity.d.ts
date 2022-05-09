
declare interface HeadersMap {
	has: (name: string) => boolean;
	get: (name: string) => string;
    set: (name: string, value: string|number|boolean) => this;
    forEach: (callback: (value: string, key: string, map: Map<string, string>) => void) => void;
}

declare interface IThreadReq {
    hash: string;
    headers: HeadersMap;
    hostname: string;
    ip: string;
    method: string;
    pathname: string;
    searchParams: URLSearchParams;

    body?: TObject;
}

declare interface IThreadRes {
    headers: HeadersMap;
    
    headersOnly?: boolean;
    message?: string|Buffer;
    status?: number;
    staticCacheKey?: string;
}