import { IEntityInfo } from "../interfaces";

export type TEndpointHandler = (body: TObject, req: IEntityInfo) => unknown;