
export interface IPluginOptions {
    alias?: string;
    integrateManually?: boolean;
    muteRendering?: boolean;
    muteEndpoints?: boolean;
}

export interface IPassivePlugin {
    name: string;
    modulePath: string;
    options: IPluginOptions;
}
