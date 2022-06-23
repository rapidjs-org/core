/**
 * Module containing the handler routine for plug-in (motivated)
 * requests (endpoint functionality).
 */


import { IRequest, IResponse } from "../../core/core";

import { IEndpointHandlerResult } from "../interfaces";
import { evalEntityInfo } from "../entity";
import { activateEndpoint } from "../plugin/endpoint";

import { EStatus } from "./EStatus";


interface IPluginPayload {
	pluginName: string;

	body?: TObject;
	endpointName?: string;
}

/**
 * Handle plug-in request accordingly.
 * @param {core.IRequest} req Thread request object
 * @param {core.IResponse} res Thread response object
 * @returns {core.IResponse} Modified thread response object
 */
export default function(req: IRequest, res: IResponse): IResponse {
    evalEntityInfo(req);
	
    const payload: IPluginPayload = req.body as unknown as IPluginPayload;
	
	if(!payload) {
		res.status = EStatus.PRECONDITION_FAILED;

		return res;
	}

	res.headers.set("Content-Type", "application/json");
	
	const handlerResult: IEndpointHandlerResult|number = activateEndpoint(payload.pluginName, payload.body, payload.endpointName);
	const resultObject: IEndpointHandlerResult = ((handlerResult instanceof Number) || (typeof(handlerResult) === "number"))
		? {
			status: handlerResult as number
		}
		: handlerResult;
	
    res.status = resultObject.status;
    res.message = resultObject.data ? JSON.stringify(resultObject.data) : null;
    
    return res;
}