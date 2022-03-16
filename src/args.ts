
// Input sequence (by words)
const input: string[] = process.argv.slice(2);

// Parse arguments record
const args: Record<string, string|boolean> = {};


/**
 * Parse given CLI arguments against a name for value retrieval
 * (or evaluation).
 */
function parse(name: string, shorthand?: string, requireBinary: boolean = false): string|boolean {
	name = name.toLowerCase();

	// Retrieve index in input array
	const index: number = Math.max(input.indexOf(`--${name}`), shorthand
		? input.indexOf(`-${shorthand.toUpperCase()}`)
		: -1);
	
	if(!requireBinary) {
		return (index !== -1)
		? true
		: false;
	}

	// Read optionally given value (next word in input sequence)
	// Check if consequitve word exists and is not an argument itself
	const consequtiveWord: string = input[index + 1];
	return /^[^-]/.test(consequtiveWord || "")
	? consequtiveWord
	: undefined;
}

/**
 * Obtain unary CLI argument value (boolean; state of existence/provision).
 * @param {string} name Argument name
 * @param {string} [shorthand] Argument shorthand (processed all uppercase)
 * @returns {boolean} Argument state
 */
export function unaryArgument(name: string, shorthand?: string): boolean {
	if(args[name] === undefined) {
		args[name] = parse(name, shorthand);
	}
	
	return !!args[name];
}

/**
 * Obtain binary CLI argument value (string; succeeding sequence part).
 * @param {string} name Argument name
 * @param {string} [shorthand] Argument shorthand (processed all uppercase)
 * @returns {string} Argument value
 */
export function binaryArgument(name: string, shorthand?: string): string {
	if(args[name] === undefined) {
		args[name] = parse(name, shorthand, true);
	}
	
	return args[name]
	? String(args[name])
	: undefined;
}


/**
 * Registered:
 * 
 * --dev, -D: 	 Activates DEV MODE
 * --wd, -W:     Sets project working directory (path relative to CWD or absolute)
 */