declare interface ThreadReq {
    headers,
    hostname: string,
    ip: string,
    method: string,
    pathname: string,
    searchParams: URLSearchParams
}

declare interface ThreadRes {
    headers,
    
    message?: string
    status?: number,
}