/**
 * Application formatted output interface for internal use.
 */

const config = {
	appName: "rJS"
};


import { mkdirSync, appendFile } from "fs";
import { join } from "path";
import { EventEmitter } from "events";

import { argument } from "./args";
import { normalizePath } from "./util";


/*
 * Construct absolute path from possibly given log argument.
 * Inherently create directory (path) if does not exist.
 */
let logDirPath: string = argument("log", "L").binary;
logDirPath = logDirPath ? normalizePath(logDirPath) : undefined;

// TODO: Create error?
logDirPath && mkdirSync(logDirPath, {
	recursive: true
});

/*
 * Even emitter for individual programmatic logging purposes.
 * To provide to the user interface.
 */
const eventEmitter = new EventEmitter();


enum Channel {
	LOG = "log",
	ERROR = "error"
};

enum Event {
	INFO = "info",
	DEBUG = "debug",
	ERROR = "error"
};


function log(message: string, channel: Channel) {
	console[channel](print.format(`[${config.appName}]`, [
		print.Format.YELLOW
	]), message);
}

/**
 * Write a message to the console.
 * Eemit a respective event and optionally write to log file.
 * @param {Channel} channel Log channel
 * @param {Event} event Log event
 * @param {string} message Log message
 * @returns 
 */
function write(message: string, channel: Channel, event: Event) {
	log(message, channel);

	// Emit respective log event
	eventEmitter.emit(event, message);

	if(!logDirPath) {
		return;
	}

	// Write to log file if log directory path given via argument
	const date: Date = new Date();
	const day: string = date.toISOString().split("T")[0];
	const time: string = date.toLocaleTimeString();

	appendFile(join(logDirPath, `${day}.log`),
	`[${time}]: ${message.replace(/\x1b\[[0-9]{1,2}m/g, "")}\n`,
	err => {
		err && log(err.message, Channel.ERROR);
	});
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
	
	export function info(message: string) {
		write(message, Channel.LOG, Event.INFO);
	}
	
	export function debug(message: string) {
		write(message, Channel.LOG, Event.DEBUG);
	}

	export function error(message: string) {
		write(message, Channel.ERROR, Event.ERROR);
	}

}