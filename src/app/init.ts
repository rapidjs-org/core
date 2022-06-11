
// Initialze configuration files (static access from Config class)
import "./config/config.project";
import "./config/config.plugins";

import { Config, PATH } from "../core/core";

import { initWatch } from "./watch/ws.server";
import { watch } from "./watch/watch";


initWatch();


// Project directory top level (non-recursively)
watch(PATH, () => {
    // TODO: Watch in detail with according modular reload?
}, false);

// Web file directory (recursively)
watch(Config["project"].read("directory", "web").string);   // TODO: Check why reload happens, but files are not updated!