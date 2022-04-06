declare interface ThreadReq {
    ip: string,
    method: string,
    hostname: string,
    pathname: string,
    searchParams: URLSearchParams
}

declare interface ThreadRes {
    status: number,
    
    message?: string
}