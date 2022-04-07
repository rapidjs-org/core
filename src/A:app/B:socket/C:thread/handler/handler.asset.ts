
import { extname } from "path";

import { Status } from "../../Status";


export default function(tReq: ThreadReq, tRes: ThreadRes): ThreadRes {
    // Retrieve type of asset request to apply respective sub-routine
    if(false) { // TODFO: Implement
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


function handlePlugin(tRes: ThreadRes, pathname: string): ThreadRes {
    return tRes;
}

function handleStatic(tRes: ThreadRes, pathname: string): ThreadRes {
    return tRes;
}

function handleDynamic(tRes: ThreadRes, tReq: ThreadReq): ThreadRes {
    tRes.message = "ABC";
    
    return tRes;
}

function handleDynamicError(): ThreadRes {
    return {} as ThreadRes;
}