declare interface ThreadReq {
    hostname: string,
    ip: string,
    method: string,
    pathname: string,
    searchParams: URLSearchParams
}

declare interface ThreadRes {
    headers?: Map<string, string>,
    message?: string
    status?: number,
}