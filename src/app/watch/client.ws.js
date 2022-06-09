(_ => {
    
	/* function log(message, ...styles) {
		console.log.apply(null,
			[`%c[rJS] %c${message}`, "color: #E0DD00;", "color: auto;"]
			.concat(styles));
	}
	
	let logCloseMessage = _ => {
		log("Server has been %cshut down", "color: #FF4747; font-style: italic;");
		log("Perform manual reload to resubscribe when server has been restarted");
	}; */

	// Connect to live functionality websocket system
	const ws = new WebSocket("ws://localhost:@WS_PORT");	// Uses config port (substituted upon reading)
	ws.onopen = _ => {
		/* log("Running DEV MODE");
		log("Subscribed to %cautomatic reload %cupon changes",
		"color: #00DE7E; font-style: italic;", "color: auto;"); */
		
		ws.onmessage = _ => {
			// Perform reload upon message retrieval (any message)
			document.location.reload();
		};
		
		ws.onclose = _ => {
			//setTimeout(logCloseMessage || (_ => {}), 500);
		};
	};
	
	document.addEventListener("beforeunload", _ => {
		// Prevent duplicate shut down message display
		//logCloseMessage = null;
	});

})();