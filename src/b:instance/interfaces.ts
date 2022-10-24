export interface ISerializedURL {
    hash: string;
    host: string;
    hostname: string;
    href: string;
    origin: string;
    password: string;
    pathname: string;
    port: string;
    protocol: string;
    search: string;
    username: string;
    searchParams: Record<string, string>;
}

export interface IRequest {
    url: ISerializedURL;
    headers: Record<string, string|string[]>;
    
    body?: unknown;
}

export interface IResponse {
    status: number;
    
    headers?: Record<string, string|string[]>;
    message?: string|number|boolean|Buffer;
}