
import { join } from "path";


/**
 * Merge two objects with right associative override (recursive).
 * @param {Record} target Object 1
 * @param {Record} source Object 2 (overriding)
 * @returns {Record} Merged object.
 */
export function mergeObj(...objs: TObject[]): TObject {
	if(objs.length === 1) {
		return objs[0];
	}

	const source: TObject = objs.pop() || {};
	let target: TObject = objs.pop() || {};

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
			target[key] as TObject,
			source[key] as TObject
		);
	}

	target = {...target, ...source}; // Merge top level
	
	return mergeObj(...objs, target);
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

export function absolutizePath(path: string, root: string): string {
	if(!path) {
		return null;
	}
	
	return /^[^/]/.test(path)
	? join(root || "", path)
	: path;
}