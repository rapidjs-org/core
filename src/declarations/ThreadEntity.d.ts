declare interface ThreadReq {
    ip: string,
    method: string,
    url: string
}

declare interface ThreadRes {
    status: number,
    
    message?: string
}