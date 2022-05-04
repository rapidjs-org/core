
import { Status } from "../../Status";


interface IPluginPayload {
	pluginName: string;

	body?: unknown;
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

	console.log(payload);
	
	tRes.message = "ABC";

	return tRes;
}