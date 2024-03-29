/**
 * Class representing an entity for plugin induced request processing.
 * Concludes to endpoint utilization and according responses.
 */


import { serverConfig } from "../../config/config.server";

import { output } from "../../utilities/output";

import { ResponseError } from "../../interface/custom-response/ResponseError";
import { Endpoint } from "../../interface/plugin/Endpoint";

import { Entity } from "./Entity";


export class PluginEntity extends Entity {
    constructor(req, res) {
    	super(req, res);
    }

	protected process() {
		const body = [];

		this.requestEvent("data", chunk => {
			body.push(chunk);

			if((body.length * 8) <= serverConfig.limit.payloadSize) {
				// Continue on body stream as payload limit not yet reached
				return;
			}

			// Abort processing as bdy payload exceeds maximum size
			// Limit to be optionally set in server configuration file
			throw true;
		});

		this.requestEvent("end", () => {
			// Parse payload
			let payload: {
				pluginName: string;
			
				endpointName?: string;
				body?: unknown;
			};
			try {
				payload = (body.length > 0) ? JSON.parse(body.toString()) : null;
			} catch(err) {
				// Malformed body
				return this.respond(422);
			}

			if(!Endpoint.has(payload.pluginName, payload.endpointName)) {
				// No related endpoint found
				return this.respond(404);
			}
			
			// Parse meta information
			this.parseCookies();
			this.parseSubdomain();
			this.parseLocale();
			
			// Retrieve related page path
			this.webPath = this.retrieveDynamicPath();
			
			try {
				try {
					const data: Buffer = Endpoint.use(payload.pluginName, payload.body, payload.endpointName);
					
					this.respond(200, data);
				} catch(err) {
					if(err instanceof ResponseError) {
						// Manual error response
						return this.respond(err.status, Buffer.from(JSON.stringify(err.message), "utf-8"));
					}

					throw err;
				}
			} catch(err) {
				output.error(err);

				this.respond(err.status, err.message);
			}
		});

		this.requestEvent("error", err => {
			if(err === true) {
				// Intercept intentional value thrown on payload limit reached (true)
				this.respond(413);
			}

			// Pass through unexpected error
			throw err;
		});
	}
	
	public respond(status: number, message?: Buffer) {
		this.setHeader("Content-Type", "application/json");
		this.setHeader("X-Content-Type-Options", "nosniff");
		
		super.respond(status, message);
	}

}