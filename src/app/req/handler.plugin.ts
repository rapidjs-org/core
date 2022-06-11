
import { IRequest, IResponse } from "../../core/core";

import { IEndpointHandlerResult } from "../interfaces";
import { evalEntityInfo } from "../entity";
import { activateEndpoint } from "../plugin/registry";


interface IPluginPayload {
	pluginName: string;

	body?: TObject;
	endpointName?: string;
}


export default function(req: IRequest, res: IResponse): IResponse {
    evalEntityInfo(req);

    const payload: IPluginPayload = req.body as unknown as IPluginPayload;
    
	res.headers.set("Content-Type", "application/json");
	res.headers.set("X-Content-Type-Options", "nosniff");
	
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