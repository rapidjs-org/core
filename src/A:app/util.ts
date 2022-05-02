
import { join } from "path";

import { PROJECT_PATH } from "./path";


/**
 * Normalize path.
 * Use path as given if is indicated from root or construct absolute path from project path.
 * @param {string} path Raw path
 * @returns {string} Normalized path
 */
export function normalizePath(path: string): string {
	return join(PROJECT_PATH, path);
}