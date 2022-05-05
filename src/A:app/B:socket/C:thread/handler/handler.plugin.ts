
import { print } from "../../../../print";

import { Status } from "../../Status";

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

	// TODO: Parse subdomain
	tRes.headers.set("Content-Type", "application/json");
	tRes.headers.set("X-Content-Type-Options", "nosniff");
	
	const handlerResult: unknown = activateEndpoint(payload.pluginName, payload.body, payload.endpointName);

	if(!handlerResult) {
		print.debug(`Undefined ${payload.endpointName ? `'${payload.endpointName}'` : "default"} endpoint of plug-in '${payload.pluginName}' has been requested`);
		
		tRes.status = Status.NOT_FOUND;
		
		return tRes;
	}

	tRes.message = JSON.stringify(handlerResult);

	return tRes;
}