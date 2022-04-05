/**
 * Application formatted output interface for internal use.
 */

const config = {
	appName: "rJS"
};


enum Channel {
	LOG = "log",
	ERROR = "error"
};


function out(channel: Channel, message: string) {
	console[channel](print.format(`[${config.appName}]`, [
		print.Format.YELLOW
	]), message);

	// TODO: Write log file atomic (or bubble up?)
}


export namespace print {
	
	export enum Format {
		BOLD = 1,
		
		RED = 31,
		YELLOW = 33
	}

	export function format(str: string, formatFlags: Format[]) {
		return `${formatFlags.map(flag => `\x1b[${flag}m`).join("")}${str}\x1b[0m`;
	}

	export function log(message: string) {
		out(Channel.LOG, message);
	}

	export function error(message: string) {
		out(Channel.ERROR, message);
	}

}