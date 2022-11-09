import { parseFlag } from "./args";


const devFlagSet: boolean = (process.env.dev === "true") || parseFlag("dev", "D");


export const MODE = {
    DEV: devFlagSet,
    PROD: !devFlagSet,

    DEBUG: parseFlag("core-debug-output") // TODO: No user expose (override upon build routine)
    
    // TODO: Open for more modes (all-explicit activation; PROD as default / fallback?)
};