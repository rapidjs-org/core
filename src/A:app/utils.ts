

/**
 * Merge two objects with right associative override (recursive).
 * @param {Record} target Object 1
 * @param {Record} source Object 2 (overriding)
 * @returns {Record} Merged object.
 */
 export function mergeObj(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
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