/**
 * Application formatted output interface for internal use.
 */

const config = {
	appName: "rJS"
};

import { clusterContext  } from "./cluster";


export namespace print {

	enum Channel {
		LOG = "log",
		ERROR = "error"
	};

	enum FormatFlag {
		YELLOW = 33
	}

	function out(channel: Channel, message: string) {
		console[channel](format(`[${config.appName}]`, [
			FormatFlag.YELLOW
		]), message);

		// TODO: Write log file atomic (or bubble up?)
	}

	export function format(str: string, formatFlags: FormatFlag[]) {
		return `${formatFlags.map(flag => `\x1b[${flag}m`).join("")}${str}\x1b[0m`;
	}

	export function log(message: string) {
		out(Channel.LOG, message);
	}

	export function error(message: string) {
		out(Channel.ERROR, message);
	}

}