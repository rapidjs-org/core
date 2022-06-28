/**
 * Module containing globally considerable, context-free utility functions.
 */


import { join } from "path";

import { PATH } from "./PATH";


/**
 * Normalize relative path to project root absolute representation.
 * @param {string} relativePath project relative path
 * @returns {string} Absolute project normalized path
 */
export function projectNormalizePath(relativePath: string): string {
	return join(PATH, relativePath);
}

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
 * Create a single element array from a value iff is not yet an array.
 * For value array type unification.
 * @param {*} value Value to arrayify
 * @returns {*[]} Arrayified value
 */
export function arrayify(value: unknown|unknown[]) {
	return !Array.isArray(value)
	? [value]
	: value;
}