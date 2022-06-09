/**
 * Module containing a CLI argument parser and type resolver for use in multiple memory
 * space environments. Does not require a global definition model. Any argument list is
 * accepted and parsed on demand. Each argument retrieval can be resolved both ways:
 * As an option or as a parameter.
 * Manually register argument usage in ordrer to prevent multiple argument semantics.
 * Optionally intercept individual help argument (commonly -h) to provide usage synopsis.
 */


// Input CLI argument sequence (by additional words)
const input: string[] = process.argv.slice(2);

// Already parsed arguments record
const args: Record<string, string|boolean> = {};


/**
 * Parse argument from CLI input sequence.
 * @param {string} name Argument name
 * @param {string} [shorthand] Argument shorthand (processed all uppercase)
 * @returns {string|boolean} Parsed argument (state if given as option, value if given as parameter)
 */
function parseArgument(name: string, shorthand?: string) {
	// Retrieve index in input words array
	const index: number = Math.max(input.indexOf(`--${name.toLowerCase()}`), shorthand
		? input.indexOf(`-${shorthand.toUpperCase()}`)
		: -1);
	
	if(index == -1) {
		// No such word given
		return undefined;
	}

	// Return successive word in input sequence if is given and not an argument itself.
	// Return positive boolean to just state existence otherwise.
	const consequtiveWord: string = input[index + 1];
	return /^[^-]/.test(consequtiveWord || "")
		? consequtiveWord
		: true;
}


/**
 * Retrieve argument resolve interface. Resolves depending on input sequence.
 * @param {string} name Argument name
 * @param {string} [shorthand] Argument shorthand
 * @returns Resolve interface (option or parameter interpretation)
 */
export function argument(name: string, shorthand?: string): {
	option: boolean,
	parameter: string,
} {
	// Retrieve possibly parse value
	args[name] = args[name] || parseArgument(name, shorthand);

	return {
		/**
		 * Obtain argument option (boolean; state of existence in input sequernce).
		 * @returns {boolean} Argument state
		 */
		option: !!args[name],
		/**
		 * Obtain argument parameter value (string; consequtive, non-argument word).
		 * @returns {string} Argument value
		 */
		parameter: (args[name] !== undefined)
			? String(args[name])
			: undefined
	};
}