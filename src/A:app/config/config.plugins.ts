/**
 * Read plugin configuration file object to be consumed.
 */


import config from "../app.config.json";

import { Config } from "./Config";


export const PLUGINS_CONFIG = new Config(config.configFileNamePlugins);