import { IncomingMessage } from "http";


export class Request {

    public readonly url: URL;
    public readonly headers: Map<string, string|string[]>;
    public readonly body: unknown;

    constructor(oReq: IncomingMessage, body) {
        this.url = new URL(oReq.url);   // TODO: Defined host name(s)
        this.headers = new Map(Object.entries(oReq.headers));
        this.body = ;
    }

}