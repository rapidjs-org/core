/**
 * Reusable/module overlapping interface declarations.
 */


import { ServerResponse } from "http";

import { CookiesMap } from "./CookiesMap";
import { HeadersMap } from "./HeadersMap";


export interface ISimpleURL {
    hash: string;
    hostname: string;
    pathname: string;
    searchParams: TObject;
    searchString: string;
};

export interface IRequest {
    headers: HeadersMap;
    cookies: Map<string, string>;
    ip: string;
    method: string;
    url: ISimpleURL;
    
    body?: TObject;
};

export interface IResponse {
    cacheable?: boolean;
    cookies?: CookiesMap;
    headers?: HeadersMap;
    message?: string|Buffer;
    status?: number;
};

export interface IContext {
    encode: string;
	headersOnly: boolean;
	oRes: ServerResponse;
    url: string;
}