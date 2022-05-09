
import { HeadersMap } from "./HeadersMap";


export interface IThreadReq {
    hash: string;
    headers: HeadersMap;
    hostname: string;
    ip: string;
    method: string;
    pathname: string;
    searchParams: URLSearchParams;

    body?: TObject;
}

export interface IThreadRes {
    headers: HeadersMap;
    
    headersOnly?: boolean;
    message?: string|Buffer;
    status?: number;
    staticCacheKey?: string;
}