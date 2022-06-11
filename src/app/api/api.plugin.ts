/**
 * Individual plug-in application interface.
 * To be utilized for plug-in initialization and operation.
 */


// TODO: Implement


export { bindClientModule as clientModule, defineEndpoint as endpoint } from "../plugin/registry";

export function render(associatedPluginName: string) {
	// TODO: Implement? Move to plug-in context?
}

/* export function readPageFile(associatedPluginName: string, name: string): string {
	return "";
} */

export function readSupportFile(associatedPluginName: string, name: string): string {
	return "";
}