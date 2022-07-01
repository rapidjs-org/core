/**
 * Module containing an application flavored print interface. Unless manually
 * disabled, any output is preceeded with a common application prefix and
 * applied type-based highlighting.
 * Each output write call is triggering both a channel specific and a universal
 * print event in order to intercept output from an individual context (e.g. a
 * file log writer).
 */


const config = {
	...require("./src.config.json"),

	initialSingleMessageWindow: 2500,
	repeatedMessageCumulationWindow: 5000
};

import cluster from "cluster";
import { EventEmitter } from "events";

import { argument } from "./argument";
import { MODE } from "./MODE";


/**
 * Output std channels enumeration.
 */
enum Channel {
	LOG = "log",
	ERROR = "error"
}
/**
 * Print and according event types enumeration.
 */
enum Event {
	INFO = "info",
	DEBUG = "debug",
	ERROR = "error"
}


/*
 * Event emitter for individual programmatic logging purposes.
 * Extended with universal listener interface.
 */
type TUniversalEventListener = (eventName: string | symbol,  ...args) => void;

class UniversalEventEmitter extends EventEmitter {
	
	private readonly universalListeners: TUniversalEventListener[] = [];

	public emit(eventName: string|symbol, ...args): boolean {
		this.universalListeners.forEach((listenerCallback: TUniversalEventListener) => {
			listenerCallback(eventName, ...args);
		});

		return super.emit(eventName, ...args);
	}

	public all(listenerCallback: TUniversalEventListener) {
		this.universalListeners.push(listenerCallback);
	}

}


let inInitialMessageWindow: boolean = true;
const printEventEmitter = new UniversalEventEmitter();
let lastPrimaryMessage: {
	count: number;
	str: string;
	time?: number;
} = null;


setTimeout(() => {
	inInitialMessageWindow = false;
}, config.initialSingleMessageWindow);


/**
 * Write a message to the console.
 * Eemit a respective event and optionally write to log file.
 * @param {string} message Log message
 * @param {Channel} channel Log channel
 * @param {Event} event Log event
 * @param {boolean} [noFormatting] Whether to not format the output (no app prefix and highlighting)
 * @returns 
 */
function write(message: string, channel: Channel, event: Event, noFormatting: boolean = false) {
	if(argument("mute", "M").parameter) {
		// No output if application is muted
		return;
	}
	
	// Identical message cumulation
	if(cluster.isPrimary && (channel === Channel.LOG) && lastPrimaryMessage
	&& lastPrimaryMessage.str === (message || "")
	&& (Date.now() - config.repeatedMessageCumulationWindow) <= lastPrimaryMessage.time) {
		// No cumulative messages in initialization window (assuming uniform threads initialization logs)
		if(inInitialMessageWindow) {
			return;
		}

		message = message
		.replace(/\n$/, ` ${print.format(`(${++lastPrimaryMessage.count})`, [print.Format.FG_RED])}`);

		// Clear last line (for count update)
		// TODO: How to detect console lines from outside (to keep it)
		try {
			process.stdout.moveCursor(0, -1);
  			process.stdout.clearLine(1);
		} catch {}
	} else {
		lastPrimaryMessage = {
			count: 1,
			str: message
		};

		message = message.replace(/\n$/, "");
	}
	lastPrimaryMessage.time = Date.now();
	
	// Apply formatting (iff not disabled)
	// Preprend message by application prefix
	// Inherently highlight numbers
	message = !noFormatting
	? `${print.format(config.cliPrefix, [
		print.Format.T_BOLD,
		print.Format.T_DIM,
		print.Format.T_ITALIC,
		print.Format.BG_YELLOW
	])} ${
		message.replace(/(^|[ ,.:])([0-9]+)([ ,.]|$)/g, `$1${print.format("$2", [
			print.Format.FG_CYAN
		])}$3`)
	}`
	: message;
	
	// TODO: Extensive type based formatting?
	
	// Write message to std channel preprended by application prefix (if not omitted)
	process[`std${(channel === Channel.LOG) ? "out" : "err"}`].write(`${message}\n`);
	
	// Emit respective log event (always also triggers the universal event)
	cluster.isPrimary
	&& printEventEmitter.emit(event, message.replace(/\x1b\[(;?[0-9]{1,3})+m/g, "")); // Bubble up manually from threads in order to serve one interface
}


// TODO: Print bubble up interface to (cumulate multi thread output)


export namespace print {

	/**
	 * String formatting code enumeration.
	 */
	export enum Format {
		T_BOLD = 1,
		T_DIM = 2,
		T_ITALIC = 3,

		FG_GRAY = 90,
		FG_RED = "38;2;255;90;90",
		FG_YELLOW = "38;2;250;245;150",
		FG_CYAN = 96,
		
		BG_YELLOW = "48;2;250;245;150"
	}

	/**
	 * Format a string given format flags.
	 * @param {string} str String to format
	 * @param {Format} formatFlags Array of format flags
	 * @returns {string} Formatted string
	 */
	export function format(str: string, formatFlags: Format[]) {
		return `${formatFlags.map(flag => `\x1b[${flag}m`).join("")}${str}\x1b[0m`;
	}
	
	/**
	 * Print info message to console.
	 * @param {string} message Info message
	 * @param {boolean} [noFormatting] Whether to omit the application log prefix
	 */
	export function info(message: string, noFormatting?: boolean) {	// Core interface without last arg (useless)
		write(message, Channel.LOG, Event.INFO, noFormatting);
	}

	/**
	 * Print debug message to console.
	 * @param {string} message Debug message
	 * @param {boolean} [noFormatting] Whether to omit the application log prefix
	 */
	export function debug(message: string, noFormatting?: boolean) {
		if(!MODE.DEV) {
			return;
		}
		
		write(message, Channel.LOG, Event.DEBUG, noFormatting);
	}

	/**
	 * Print error message to console. Output types differ based on given error entity type.
	 * @param {Error|string} errEntity Error entity (typed either error object or message)
	 * @param {boolean} [noFormatting] Whether to omit the application log prefix
	 */
	export function error(errEntity: Error|string, noFormatting?: boolean) {
		write(format((errEntity instanceof Error) ? errEntity.message : String(errEntity), [
			Format.FG_RED
		]), Channel.ERROR, Event.ERROR, noFormatting);
		
		(errEntity instanceof Error) && console.log(format(errEntity.stack, [ Format.FG_GRAY ]));

		// TODO: Terminate on error in DEV MODE?
	}

	// TODO: Prompt method?

	/**
	 * Print event listener interface with extensive universal property.
	 */
	export const on = (...args) => {
		printEventEmitter.on.apply(printEventEmitter, args);
	};
	export function all(...args) {	// TODO: "all" as event name?
		printEventEmitter.all.apply(printEventEmitter, args);
	}
}