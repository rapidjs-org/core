/**
 * Application specific argument parser.
 */


const args: string[] = process.argv.slice(2);

/**
 * Retrieve the index of a name in the arguments array.
 * @param name Full name (without indicating double dashes)
 * @param shorthand Shorthand name (without indicating single dash)
 * @returns Value type resolve interface
 */
function getNameIndex(name: string, shorthand?: string): number {
    return Math.max(args.indexOf(`--${name}`), shorthand ? args.indexOf(`-${shorthand}`) : -1);
}

/**
 * Parse a specific flag from the given command line arguments.
 * @param name Flag name (without indicating double dashes)
 * @param shorthand Flag shorthand (without indicating single dash)
 * @returns Value type resolve interface
 */
export function parseFlag(name: string, shorthand?: string): boolean {
    return (getNameIndex(name, shorthand) >= 0);
}

/**
 * Parse a specific option from the given command line arguments.
 * @param name Option name (without indicating double dashes)
 * @param [shorthand] Option shorthand (without indicating single dash)
 * @returns Value type resolve interface
 */
export function parseOption(name: string, shorthand?: string): {
    string: string;
    number: number;
} {
    let index: number = getNameIndex(name, shorthand);
    if(index < 0 || ++index >= args.length) {
        return undefined;
    }

    /*
    * Create an object from a value with type specific properties.
    * Utilize after parsing an option in order to fit type.
    */
    return {
        string: args[index],
        number: +args[index]
    };
}