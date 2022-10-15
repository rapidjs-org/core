import http from "http";
import https from "https";


import { EVENT_EMITTER } from "../EVENT_EMITTER";
import { APP_CONFIG } from "../config/APP_CONFIG";


const runsSecure: boolean = !!APP_CONFIG.tls;
const commonOptions = {
    server: {},
    socket: {}
};


// TODO: Support HTTP/2
https.createServer({
    ...(runsSecure ? {} : {}),  // TODO: ...
    ...commonOptions.server
}, async (oReq: http.IncomingMessage, oRes: http.ServerResponse) => {
    try {
        const body: unknown = parseRequestBody(oReq);
    } catch(err) {
        
    }
}).listen({
    ...commonOptions.socket,

    port: APP_CONFIG.port
}, () => {
    EVENT_EMITTER.emit("listening");   // TODO: To cluster module (mem space A)
});


function parseRequestBody(oReq: http.IncomingMessage): Promise<unknown> {
    const body: string[] = [];
    
    return new Promise((resolve, reject) => {
        oReq.on("data", chunk => {
            body.push(chunk);
        });

        oReq.on("end", () => {
            try {
                resolve(body.length ? JSON.parse(body.join("")) : null);
            } catch(err) {
                
            }
        });

        oReq.on("error", err => {
            reject(err)
        });
    });
}