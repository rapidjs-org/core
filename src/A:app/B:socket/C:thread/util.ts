import { createHash } from "crypto";


export function parseSubdomain(hostname: string): string {
    const subdomain: string = hostname;

    return subdomain;
}

export function computeETag(fileContents: string): string {
    return createHash("md5").update(fileContents).digest("hex");
}