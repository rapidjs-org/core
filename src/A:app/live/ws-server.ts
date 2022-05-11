
const config = {
	wsPort: 5757
};


import http from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { server as WebSocketServer } from "websocket";

import { MODE } from "../mode";


// Read client script
const clientScript: string = String(readFileSync(join(__dirname, "ws-client.js")))
	.replace(/@WS_PORT/, String(config.wsPort));	// With configured websocket port (mark substitution)

const connections = [];


startServer();


function startServer() {
	if(!MODE.DEV) {
		return;
	}
	
	// Create substantial HTTP server
	const webServer = http
		.createServer()
		.listen(config.wsPort);

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

/**
 * Porpose a refresh activity to the client.
 */
export function proposeRefresh() {
	(connections || []).forEach(connection => {
		connection.sendUTF("1");
	});
}

// TODO: Integrate client script into markup