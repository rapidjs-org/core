
import { Status } from "../../Status";
import { IThreadReq, IThreadRes } from "../../interfaces.thread";

import { activateEndpoint } from "../plugin/registry";


interface IPluginPayload {
	pluginName: string;

	body?: TObject;
	endpointName?: string;
}


export default function(tReq: IThreadReq, tRes: IThreadRes): IThreadRes {
	const payload: IPluginPayload = tReq.body as unknown as IPluginPayload;

	if(!payload.pluginName) {
		tRes.status = Status.PRECONDITION_FAILED;

		return tRes;
	}

	tRes.headers.set("Content-Type", "application/json");
	tRes.headers.set("X-Content-Type-Options", "nosniff");
	
	const handlerResult: {
		status: number;
		data?: unknown;
	} = activateEndpoint(payload.pluginName, payload.body, payload.endpointName);
	
	tRes.status = handlerResult.status;
	tRes.message = handlerResult.data ? JSON.stringify(handlerResult.data) : null;

	return tRes;
}