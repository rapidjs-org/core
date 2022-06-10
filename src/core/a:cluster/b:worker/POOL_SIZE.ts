/**
 * Constant to retrieve the effective thread pool size.
 */


import { cpus } from "os";

import { MODE } from "../../MODE";


 // Pool size calculation (1 in DEV MODE, |CPUS| - 1 in PROD MODE)
 // TODO: Consider optimal formula and configuration parameter?
 export const POOL_SIZE: number =  (MODE.DEV ? 1 : --cpus().length);