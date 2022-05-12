/**
 * >> START OF MAIN MEMORY (A LEVEL) <<
 */


import "./cluster";

import { initLive } from  "./live/ws-server";
import "./live/watch";


initLive();


console.log("");	// Start up message bottom margin line


// TODO: Way more verbose debug info and tips
// TODO: Error log?

export * from "./api.app";