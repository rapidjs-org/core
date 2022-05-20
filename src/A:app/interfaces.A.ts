
import { EIPCSignal } from "./EIPCSignal";


export interface IIPCPackage {
    signal: EIPCSignal;
	data: TObject;
}