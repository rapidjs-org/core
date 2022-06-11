/**
 * Module containing the core interface request handler function.
 */


import { IRequest, IResponse } from "../../core/core";

import { EStatus } from "./EStatus";

import assetHandler from "./handler.asset";


/**
 * Application concrete request handler function serving the core interface.
 * @param {core.IRequest} req Thread request object
 * @param {core.IResponse} res Thread response object
 * @returns {core.IResponse} Modified thread response object
 */
export default function(req: IRequest, res: IResponse): IResponse {
    // Expel superfluous HTTP methods
    if(!["GET", "POST"].includes(req.method)) {
        res.status = EStatus.UNSUPPORTED_METHOD;
        
        return res;
    }

    res = assetHandler(req, res);


    return res;
}