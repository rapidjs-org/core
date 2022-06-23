/**
 * Individual plug-in application interface.
 * To be utilized for plug-in initialization and operation.
 */


// TODO: Implement


export { bindClientModule as clientModule } from "../plugin/registry";
export { defineEndpoint as endpoint } from "../plugin/endpoint";
export { defineRender as render } from "../plugin/render";


/* export function readPageFile(associatedPluginName: string, name: string): string {
	return "";
} */

export function readSupportFile(associatedPluginName: string, name: string): string {
	return "";
}