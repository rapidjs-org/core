/**
 * >> START OF MAIN MEMORY (A LEVEL) <<
 */


import "./cluster";

import { initLive } from  "./live/ws-server";
import "./live/watch";


initLive();


// TODO: Way more verbose debug info and tips
// TODO: Error log?

export * from "./api.app";