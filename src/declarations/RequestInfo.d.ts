declare interface IRequestInfo {
    auth: string;
    ip: string;
    pathname: string;
    subdomain: string|string[];
}