/**
 * Constant to retrieve whether the server is maintaining a
 * secure connection environment.
 */


import { Config } from "../config/Config";


// Whether the server is maintaining a secure connection environment
export const IS_SECURE = !!Config["project"].read("port", "https").number;