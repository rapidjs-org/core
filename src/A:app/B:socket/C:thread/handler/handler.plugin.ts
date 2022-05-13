
import { IThreadReq, IThreadRes } from "../../interfaces.B";

import { activateEndpoint } from "../plugin/registry";
import { IEndpointHandlerResult } from "../interfaces.C";


interface IPluginPayload {
	pluginName: string;

	body?: TObject;
	endpointName?: string;
}


export default function(tReq: IThreadReq, tRes: IThreadRes): IThreadRes {
	const payload: IPluginPayload = tReq.body as unknown as IPluginPayload;

	tRes.headers.set("Content-Type", "application/json");
	tRes.headers.set("X-Content-Type-Options", "nosniff");
	
	const handlerResult: IEndpointHandlerResult|number = activateEndpoint(payload.pluginName, payload.body, payload.endpointName);
	const resultObject: IEndpointHandlerResult = ((handlerResult instanceof Number) || (typeof(handlerResult) === "number"))
	? {
		status: handlerResult as number
	}
	: handlerResult;

	tRes.status = resultObject.status;
	tRes.message = resultObject.data ? JSON.stringify(resultObject.data) : null;

	return tRes;
}