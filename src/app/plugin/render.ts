
import { TRenderHandler } from "./types";


interface IRenderOptions {
	cacheable?: boolean;
}


// TODO:
// • Pre-render
// • Re-render
// • Cache render?
// ... auto deduction???

export function defineRender(associatedPluginName: string, renderHandler: TRenderHandler, options: IRenderOptions = {}) {

}