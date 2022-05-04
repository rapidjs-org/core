declare interface IThreadReq {
    headers: Map<string, unknown>,
    hostname: string,
    ip: string,
    method: string,
    pathname: string,
    searchParams: URLSearchParams,

    body?: TObject
}

declare interface IThreadRes {
    headers: Map<string, unknown>,
    
    message?: string
    status?: number
}