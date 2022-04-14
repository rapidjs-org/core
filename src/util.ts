
import { join } from "path";

import { PROJECT_PATH } from "./A:app/path";


/**
 * Merge two objects with right associative override (recursive).
 * @param {Record} target Object 1
 * @param {Record} source Object 2 (overriding)
 * @returns {Record} Merged object.
 */
 export function mergeObj(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
	// Explicitly merge sub objects
	for(const key of (Object.keys(target).concat(Object.keys(source)))) {
		if((target[key] || "").constructor.name !== "Object"
        || (source[key] || "").constructor.name !== "Object") {
			// Leaf
			target[key] = source[key] || target[key];

			continue;
		}
		
		// Recursive
		source[key] = mergeObj(
			target[key] as Record<string, unknown>,
			source[key] as Record<string, unknown>
		);
	}

	return {...target, ...source}; // Merge top level
}

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
 * Normalize path.
 * Use path as given if is indicated from root or construct absolute path from project path.
 * @param {string} path Raw path
 * @returns {string} Normalized path
 */
export function normalizePath(path: string): string {
	return (path.charAt(0) != "/")
    ? join(PROJECT_PATH, path)
    : path;
}