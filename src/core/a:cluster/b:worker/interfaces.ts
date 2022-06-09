/**
 * Type declarations for relevant HTTP request/response entity coding.
 */


import { ServerResponse } from "http";

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
    ip: string;
    method: string;
    url: ISimpleURL;
    
    body?: TObject;
};

export interface IResponse {
    cacheable?: boolean;
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

// TODO: Cookies?