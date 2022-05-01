
// Input sequence (by words)
const input: string[] = process.argv.slice(2);

// Parse arguments record
const args: Record<string, string|boolean> = {};


function parseArgument(name: string, shorthand?: string) {
	name = name.toLowerCase();

	// Retrieve index in input array
	const index: number = Math.max(input.indexOf(`--${name}`), shorthand
		? input.indexOf(`-${shorthand.toUpperCase()}`)
		: -1);

	if(index == -1) {
		return undefined;
	}

	// Read optionally given value (next word in input sequence)
	// Check if consequitve word exists and is not an argument itself
	const consequtiveWord: string = input[index + 1];
	return /^[^-]/.test(consequtiveWord || "")
		? consequtiveWord
		: true;
}


/**
 * Retrieve value of an argument (only exists if is registered and given).
 * @param {string} name Argument name
 * @param {string} [shorthand] Argument shorthand (processed all uppercase)
 * @returns Resolved interface (unary or binary argument interpretation)
 */
export function argument(name: string, shorthand?: string): {
	unary: boolean,
	binary: string,
} {
	// Retrieve possibly parse value
	args[name] = args[name] || parseArgument(name, shorthand);
	
	return {
		/**
		 * Obtain unary CLI argument value (boolean; 'state' of existence/provision).
		 * @returns {boolean} Argument state
		 */
		unary: !!args[name],
		/**
		 * Obtain binary CLI argument value (string; consequtive, non-argument word).
		 * @returns {string} Argument value
		 */
		binary: (args[name] !== undefined)
			? String(args[name])
			: undefined
	};
}