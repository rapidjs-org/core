/**
 * Common interface for retrieving scope independent environment
 * information, such as the runtime effective mode.
 */


import { MODE } from "../../core/MODE";


export { Cache, MutualClientError, MutualServerError } from "../../core/core";


export const isDevMode = !!MODE.DEV;
 
// TODO: Implement and reconsider scoping