/**
 * Constant to retrieve which mode the application is running by
 * checking whether a stated mode is active – use case individual.
 */


import { argument } from "./argument";


const isDevMode: boolean = argument("dev", "D").option;


export const MODE: Record<string, boolean> = {
	DEV: isDevMode,
	PROD: !isDevMode
};