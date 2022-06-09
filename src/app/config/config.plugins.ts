/**
 * Plug-in related configuration file.
 */


import config from "../src.config.json";

import { Config } from "../../core/core";


new Config(config.configFileNamePlugins);