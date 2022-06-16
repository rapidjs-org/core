/**
 * Module containing application specific, context-free utility functions.
 */


/**
 * Normalize file extension.
 * Remove possibly given leading dot and convert to all lowercase representation.
 * @param {string} extension Raw extension sequence
 * @returns {string} Normalized extension
 */
export function normalizeExtension(extension: string): string {
	return extension
		.trim()
		.replace(/^\./, "")
		.toLowerCase();
}

/**
 * Substitute occurrences of a certain mark (@<MARK>) in a given character
 * sequence in order to statically prepare soft coded sequences.
 * @param {string|Buffer} sequence Sequence to prepare
 * @param {string} mark Mark to substitute
 * @param {string} value Value to write
 * @returns {string} Prepared sequence
 */
export function substituteMark(sequence: string|Buffer, mark: string, value: string|number): string {
	return String(sequence).replace(new RegExp(`@${mark.toUpperCase()}`, "g"), String(value));
}