
import { extname } from "path";

import { Status } from "../../Status";

import { VFS } from "../vfs";
import { parseSubdomain, computeETag } from "../util";


export default function(tReq: IThreadReq, tRes: IThreadRes): IThreadRes {
	// Retrieve type of asset request to apply respective sub-routine
	if(false) { // TODO: Implement
		// Plug-in module request
		tRes = handlePlugin(tRes, tReq.pathname);
	} else if(extname(tReq.pathname).length > 0) {
		// Static file (any file that is not a .HTML file (system web page type))
		tRes = handleStatic(tRes, tReq.pathname);
	} else {
		// Dynamic file

		// TODO: Redirect explicit
		tRes = handleDynamic(tRes, tReq);
	}

	if(tRes.status !== Status.NOT_FOUND) {
		return tRes;
	}

	if(tRes.headers.get("ETag")
    && tReq.headers.get("If-None-Match") == tRes.headers.get("ETag")) {
		tRes.status = Status.USE_CACHE;

		return tRes;    // TODO: Respond shorthand?
	}

	return tRes;
}


function handlePlugin(tRes: IThreadRes, path: string): IThreadRes {
	return tRes;
}

function handleStatic(tRes: IThreadRes, path: string): IThreadRes {
	const fileStamp = VFS.read(path);
    
	if(fileStamp === undefined) {
		tRes.status = Status.NOT_FOUND;
	} else {
		tRes.message = fileStamp.contents;
		tRes.headers.set("ETag", fileStamp.eTag);
	}

	return tRes;
}

function handleDynamic(tRes: IThreadRes, tReq: IThreadReq): IThreadRes {
	const subdomain = parseSubdomain(tReq.hostname);
    
	// TODO: Use static ETag routine if plug-in do NOT server-side render markup

	tRes.message = (VFS.read(tReq.pathname) || {}).contents;
    
	if(tRes.message === undefined) {
		tRes.status = Status.NOT_FOUND;

		// TODO: Error routine
		// TODO: How to handle generic error routine?
	}

	tRes.headers.set("ETag", computeETag(tRes.message));

	return handleStatic(tRes, tReq.pathname);
}

function handleDynamicError(): IThreadRes {
	return {} as IThreadRes;
}