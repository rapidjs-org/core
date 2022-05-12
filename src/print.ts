
const config = {
	appName: "rJS"
};


import { mkdirSync, appendFile } from "fs";
import { join, dirname } from "path";
import { EventEmitter } from "events";

import { absolutizePath } from "./util";
import { argument } from "./args";


/*
 * Construct absolute path from possibly given log argument.
 * Inherently create directory (path) if does not exist.
 */
const logDirPath: string = absolutizePath(argument("log", "L").binary, dirname(require.main.filename));

// TODO: Create error?
logDirPath && mkdirSync(logDirPath, {
	recursive: true
});

/*
 * Even emitter for individual programmatic logging purposes.
 * To provide to the user interface.
 */
export const eventEmitter = new EventEmitter();


enum Channel {
	LOG = "log",
	ERROR = "error"
}

enum Event {
	INFO = "info",
	DEBUG = "debug",
	ERROR = "error"
}


function log(message: string, channel: Channel, noPrefix = false) {
	if(argument("mute", "M").binary) {
		return;
	}

	// TODO: Type based formatting
	
	// Highlight numbers
	message = message
		.replace(/(^|((?!\x1b)(.)){3})([0-9]+)/g, `$1${print.format("$4", [
			print.Format.FG_CYAN
		])}`);

	console[channel](`${!noPrefix
		? `${print.format(config.appName, [
			print.Format.T_BOLD,
			print.Format.T_DIM,
			print.Format.T_ITALIC,
			print.Format.BG_YELLOW
		])} `
		: ""}${message}`);
}

/**
 * Write a message to the console.
 * Eemit a respective event and optionally write to log file.
 * @param {Channel} channel Log channel
 * @param {Event} event Log event
 * @param {string} message Log message
 * @returns 
 */
function write(message: string, channel: Channel, event: Event, noPrefix: boolean) {
	log(message, channel, noPrefix);

	// Emit respective log event
	//eventEmitter.emit(event, message);	// TODO: Fires thread event?

	if(!logDirPath) {
		return;
	}

	// Write to log file if log directory path given via argument
	const date: Date = new Date();
	const day: string = date.toISOString().split("T")[0];
	const time: string = date.toLocaleTimeString();

	appendFile(join(logDirPath, `${day}.log`),
		`[${time}]: ${message.replace(/\x1b\[(;?[0-9]{1,3})+m/g, "")}\n`,
		err => {
			err && log(err.message, Channel.ERROR);
		});
}


export namespace print {

	export enum Format {
		T_BOLD = 1,
		T_DIM = 2,
		T_ITALIC = 3,

		FG_GRAY = 90,
		FG_RED = 91,
		FG_YELLOW = "38;2;250;245;150",
		FG_CYAN = 96,
		
		BG_YELLOW = "48;2;250;245;150"
	}

	export function format(str: string, formatFlags: Format[]) {
		return `${formatFlags.map(flag => `\x1b[${flag}m`).join("")}${str}\x1b[0m`;
	}
	
	export function info(message: string, noPrefix?: boolean) {
		// TODO: Message type cumulation argument? Ass bottom margin after type groups?
		write(message, Channel.LOG, Event.INFO, noPrefix);
	}
	
	export function debug(message: string, noPrefix?: boolean) {
		write(message, Channel.LOG, Event.DEBUG, noPrefix);
	}
	
	export function error(errEntity: Error|string|number|boolean, noPrefix?: boolean) {
		write(format((errEntity instanceof Error) ? errEntity.message : String(errEntity), [
			Format.FG_RED
		]), Channel.ERROR, Event.ERROR, noPrefix);
		
		(errEntity instanceof Error) && console.log(format(errEntity.stack, [ Format.FG_GRAY ]));

		// TODO: Terminate on error in DEV MODE?
	}

}