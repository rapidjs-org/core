/**
 * Module containing an application flavored print interface. Unless manually
 * disabled, any output is preceeded with a common application prefix and
 * applied type-based highlighting.
 * Each output write call is triggering both a channel specific and a universal
 * print event in order to intercept output from an individual context (e.g. a
 * file log writer).
 */


// TODO: Repeated message (equal) combination (replace line with amount indicator)


import config from "./src.config.json";

import { EventEmitter } from "events";

import { argument } from "./argument";


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


const printEventEmitter = new UniversalEventEmitter();


/**
 * Write a message to the console.
 * Eemit a respective event and optionally write to log file.
 * @param {Channel} channel Log channel
 * @param {Event} event Log event
 * @param {string} message Log message
 * @returns 
 */
function write(message: string, channel: Channel, event: Event, omitAppPrefix: boolean = false) {
	if(argument("mute", "M").parameter) {
		// No output if application is muted
		return;
	}
	
	// Inherently highlight numbers
	message = message
		.replace(/(^|((?!\x1b)(.)){3})([0-9]+)/g, `$1${print.format("$4", [
			print.Format.FG_CYAN
		])}`);
	// TODO: Extensive type based formatting?
	
	// Write message to std channel preprended by application prefix (if not omitted)
	console[channel](`${!omitAppPrefix
		? `${print.format(config.cliPrefix, [
			print.Format.T_BOLD,
			print.Format.T_DIM,
			print.Format.T_ITALIC,
			print.Format.BG_YELLOW
		])} `
		: ""}${message}`);
	
	// Emit respective log event (always also triggers the universal event)
	printEventEmitter.emit(event, message.replace(/\x1b\[(;?[0-9]{1,3})+m/g, ""));	// TODO: Bubble up manually from threads in order to serve one interface
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
		FG_RED = 91,
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
	 * @param {boolean} [omitAppPrefix] Whether to omit the application log prefix
	 */
	export function info(message: string, omitAppPrefix?: boolean) {
		// TODO: Message type cumulation argument? Ass bottom margin after type groups?
		write(message, Channel.LOG, Event.INFO, omitAppPrefix);
	}

	/**
	 * Print debug message to console.
	 * @param {string} message Debug message
	 * @param {boolean} [omitAppPrefix] Whether to omit the application log prefix
	 */
	export function debug(message: string, omitAppPrefix?: boolean) {
		write(message, Channel.LOG, Event.DEBUG, omitAppPrefix);
	}

	/**
	 * Print error message to console. Output types differ based on given error entity type.
	 * @param {Error|string} errEntity Error entity (typed either error object or message)
	 * @param {boolean} [omitAppPrefix] Whether to omit the application log prefix
	 */
	export function error(errEntity: Error|string, omitAppPrefix?: boolean) {
		write(format((errEntity instanceof Error) ? errEntity.message : String(errEntity), [
			Format.FG_RED
		]), Channel.ERROR, Event.ERROR, omitAppPrefix);
		
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