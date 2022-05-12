
import config from "../app.config.json";

import http from "http";
import { server as WebSocketServer } from "websocket";

import { MODE } from "../mode";


const connections = [];


MODE.DEV && startServer();


function cleanEnv() {
	// Manually close ports in case of implicit failure
	try {
		require("child_process").exec(`lsof -t -i:${config.liveWsPort} | sed -n 1p | kill -9`);
	} finally {
		process.exit();
	}
};

function startServer() {
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
	
	process.on("SIGTERM", cleanEnv);
	process.on("SIGINT", cleanEnv);
	process.on("SIGBREAK", cleanEnv);
}


export function proposeClientReload() {
	(connections || []).forEach(connection => {
		connection.sendUTF("1");
	});
}

// TODO: Integrate client script into markup