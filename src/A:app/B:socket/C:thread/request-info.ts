
import tlds from "./static/tlds.json";


let currentRequestInfo: IRequestInfo;


function parseSubdomain(hostname: string): string|string[] {
	// Stripe TLD parts as long as right-to-left concatenation is valid
	let tld = "";
	let part: string[];
	while(part = hostname.match(/\.[a-z0-9-]+$/i)) {
		if(!tlds.includes(`${part[0].slice(1)}${tld}`)) {
			break;
		}

		tld = part[0] + tld;

		hostname = hostname.slice(0, -part[0].length);
	}

	// Remove SLD name (or numerical host) to split actual subdomains
	const subdomain: string[] = hostname
	.replace(/(\.[a-z][a-z0-9_-]+|(\.[0-9]{2,3})+)$/i, "")
	.replace(/^localhost$/, "")
	.split(/\./g);

	return (subdomain.length === 1)
	? subdomain[0] || undefined	// No empty string
	: subdomain;
}


export function defineRequestInfo(tReq: IThreadReq) {
	currentRequestInfo = {
		auth: tReq.headers.get("Authorization"),
		ip: tReq.ip,
		pathname: tReq.pathname,
		subdomain: parseSubdomain(tReq.hostname)
	};
}

export function extendRequestInfo(additionalInfo: TObject) {
	currentRequestInfo = {
		...currentRequestInfo,
		...additionalInfo
	};
}

export function retrieveRequestInfo(): IRequestInfo {
	return currentRequestInfo;
}