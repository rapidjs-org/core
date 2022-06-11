
import { IResponse } from "../../core/core";

import { VFS } from "../VFS";

import { EStatus } from "./EStatus";


/**
 * Handle a static file (type 3) request.
 * @param {string} pathname Requested pathname
 * @param {core.IResponse} res Thread response object
 * @returns {core.IResponse} Modified thread response object
 */
 export default function(pathname: string, res: IResponse): IResponse {
    if(!VFS.exists(pathname)) {
        res.status = EStatus.NOT_FOUND;

		return res;
	}

	res.message = VFS.read(pathname);
    
    return res;
}