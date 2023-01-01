import { parseFlag } from "../args";


const devFlagSet: boolean = parseFlag("dev", "D");


export const MODE = {
    DEV: devFlagSet,
    PROD: !devFlagSet
};