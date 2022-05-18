
import { normalize, join } from "path";

import { PROJECT_PATH } from "./path";
import { MODE } from "./mode";


/**
 * Normalize path.
 * Use path as given if is indicated from root or construct absolute path from project path.
 * @param {string} path Raw path
 * @returns {string} Normalized path
 */
export function normalizePath(path: string): string {
	return normalize(join(PROJECT_PATH, path));
}


export function retrieveModeNames(): string[] {
	const names: string[] = [];

	for(const mode in MODE) {	// No break: supports multi mode paradigm
		(MODE[mode] === true)
		&& names.push(mode.toLowerCase());
	}

	return names;
}