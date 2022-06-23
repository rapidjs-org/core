import { IEntityInfo } from "../interfaces";

export type TEndpointHandler = (body: TObject, req: IEntityInfo) => unknown;

export type TRenderHandler = (markup: string, req: IEntityInfo) => string;