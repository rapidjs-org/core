/**
 * Retrieve whether the environment has been started in DEV MODE.
 */


import { argument } from "../args";


const isDevMode: boolean = argument("dev", "D").unary;


export const MODE: Record<string, boolean> = {
	DEV: isDevMode,
	PROD: !isDevMode
};