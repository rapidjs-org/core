
import { IPCSignal } from "./IPCSignal";


export interface IIPCPackage {
    signal: IPCSignal;
	data: TObject;
}