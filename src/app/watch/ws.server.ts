/**
 * Module containing a web socket server initialized only in DEV MODE
 * for maintaining client connections in order to be able to notify
 * the clients of server changes and trigger a client view refresh.
 * For a better using experience in development processes.
 */


import config from "../src.config.json";

import http from "http";
import { server as WebSocketServer } from "websocket";

import { MODE } from "../../core/core";


const connections = [];


export function initWatch() {
	if(!MODE.DEV) {
		return;
	}

	// Create substantial HTTP server
	const webServer = http
		.createServer()
		.listen(config.liveWsPort);

	// Create web socket server instance upon
	const wsServer = new WebSocketServer({
		httpServer: webServer
	});

	/**
	 * Handle web socket request.
	 * Add request to list of connections.
	 * @param {IncomingMessage} req Incoming request
	 */
	wsServer.on("request", req => {
		connections.push(req.accept(null, req.origin));
	});
}


export function proposeClientReload() {
	connections.forEach(connection => {
		connection.sendUTF("1");
	});
}