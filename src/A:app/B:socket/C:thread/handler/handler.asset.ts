
import { extname } from "path";

import { Status } from "../../Status";


export default function(tReq: ThreadReq): ThreadRes {
    if(false) { // TODFO: Implement
        // Plug-in module request
        return handlePlugin(tReq.pathname);
    }

    // TODO: Redirect explicit

    // Retrieve type of asset request to apply respective sub-routine
    if(extname(tReq.pathname).length > 0) {
        // Static file (any file that is not a .HTML file (system web page type))
        return handleStatic();
    }

    return handleDynamic();
}


function handlePlugin(pathname: string): ThreadRes {
    return {} as ThreadRes;
}

function handleStatic(): ThreadRes {
    return {

    } as ThreadRes;
}

function handleDynamic(): ThreadRes {
    return {
        message: "ABC"
    } as ThreadRes;
}

function handleDynamicError(): ThreadRes {
    return {} as ThreadRes;
}