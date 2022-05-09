declare interface IPluginOptions {
    alias?: string;
    integrateManually?: boolean;
    muteRendering?: boolean;
    muteEndpoints?: boolean;
}

declare interface IPassivePlugin {
    name: string;
    modulePath: string;
    options: IPluginOptions;
}

declare interface IEndpointHandlerResult {
	status: number;
	data?: unknown;
}


declare type TEndpointHandler = (body: TObject, req: IRequestInfo) => unknown;