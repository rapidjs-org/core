
import { extname } from "path";

import { Status } from "../../Status";

import { VFS } from "../vfs";


export default function(tReq: ThreadReq, tRes: ThreadRes): ThreadRes {
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

    if(!tRes.message) {
        return tRes;
    }

    // ETag header
    tRes.headers.set("ETag", "...");    // TODO: Implement

    return tRes;
}


function handlePlugin(tRes: ThreadRes, path: string): ThreadRes {
    return tRes;
}

function handleStatic(tRes: ThreadRes, path: string): ThreadRes {
    tRes.message = VFS.read(path);
    
    if(tRes.message === undefined) {
        tRes.status = Status.NOT_FOUND;

        return tRes;
    }
    
    return tRes;
}

function handleDynamic(tRes: ThreadRes, tReq: ThreadReq): ThreadRes {
    // Parse subdomain
    
    return handleStatic(tRes, tReq.pathname);
}

function handleDynamicError(): ThreadRes {
    return {} as ThreadRes;
}