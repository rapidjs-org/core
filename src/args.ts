
// Input sequence (by words)
const input: string[] = process.argv.slice(2);

// Parse arguments record
const args: Record<string, string|boolean> = {};


/**
 * Parse given CLI arguments against a name for value retrieval
 * (or evaluation).
 */
function parse(name: string, shorthand?: string): string|boolean {
	name = name.toLowerCase();

	// Retrieve index in input array
	const index: number = Math.max(input.indexOf(`--${name}`), shorthand
		? input.indexOf(`-${shorthand.toUpperCase()}`)
		: -1);

	if(index == -1) {
		// Abort if argument not passed (no record entry)
		return false;
	}

	// Read optionally given value (next word in input sequence)
	// Check if consequitve word exists and is not an argument itself
	const consequtiveWord: string = input[index + 1];
	return /^[^-]/.test(consequtiveWord || "")
		? consequtiveWord
		: true; // Simply mark as given (unary, exists)
}

/**
 * Obtain CLI argument value (string).
 * false if not given, true if given without a consequtive value.
 * @param {string} name Argument name
 * @param {string} [shorthand] Argument shorthand (processed all uppercase)
 * @returns {string|boolean} Argument value (or boolean interpretation if none given)
 */
export function argument(name: string, shorthand?: string): string|boolean {
	if(args[name] === undefined) {
		args[name] = parse(name, shorthand);
	}

	return args[name];
}