/**
 * Retrieve whether the environment has been started in DEV MODE.
 */


import { unaryArgument } from "../args";


const isDevMode: boolean = unaryArgument("dev", "D");


export const MODE: Record<string, boolean> = {
    DEV: isDevMode,
    PROD: !isDevMode
};