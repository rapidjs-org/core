/**
 * Module for initializing the concrete, thread defining server application.
 */


// Initialze configuration files (static access from Config class)
import "./config/config.project";
import "./config/config.plugins";

import { Config, PATH } from "../core/core";

import { initWatch } from "./watch/ws.server";
import { watch } from "./watch/watch";


initWatch();


// Watch project directory top level (non-recursively)
watch(PATH, () => {
    // TODO: Watch in detail with according modular reload?
}, false);

// Watch web file directory (recursively)
watch(Config["project"].read("directory", "web").string);   // TODO: Check why reload happens, but files are not updated!