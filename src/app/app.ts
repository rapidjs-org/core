/**
 * rapidJS (concrete) asset/app server application.
 * 
 * @copyright (c) Thassilo Martin Schiepanski / t-ski@GitHub
 * 
 * Web server cluster with individualizable request handler threads.
 * Provides fundamental server configuration and security measures
 * favoring implementations of specific application environments.
 */


import { bindRequestProcessor } from "../core/core";


// Bind the application concrete behavior via thread request handler
bindRequestProcessor([
    "Authorization",
    "If-None-Match"
], "./init", "./req/handler", "./plugin/handler");


export * from "./api/api.app";