declare interface IThreadReq {
    headers: Map<string, any>,
    hostname: string,
    ip: string,
    method: string,
    pathname: string,
    searchParams: URLSearchParams
}

declare interface IThreadRes {
    headers: Map<string, any>,
    
    message?: string
    status?: number
}