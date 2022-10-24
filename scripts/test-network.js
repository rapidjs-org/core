const { URL } = require("url");
const http = require("http");
const https = require("https");


const { run } = require("./test-framework.js");

run("./network/", "Network", [ 45, 120, 240 ], assert, true);

function assert(actual, expected) { // actual := endpoint information
    actual.url = new URL(actual.url
        .replace(/^(http(s)?:\/\/)?(localhost)?(\/|:)/, "http$2://localhost$4"));
    
    return new Promise(resolve => {
        performRequest(actual)
        .then(actual => {
            if((!expected.headers || Object.keys(expected.headers).length === 0)
            && !expected.status && !expected.message) {
                return false;
            }

            let hasSucceeded = true,
                displayActual = {},
                displayExpected = {};
            
            if(expected.status && expected.status !== actual.status) {
                hasSucceeded = false;
                
                displayActual.status = actual.status;
                displayExpected.status = expected.status;
            }
            
            if(expected.message) {
                let asText = false;
                try {
                    actual.message = actual.message.json();
                } catch {
                    actual.message = actual.message.text();
                    
                    asText = true;
                }

                const wrapTypeIndicator = str => wrap(str, 31);
                if(isObject(actual.message) && !isObject(expected.message)) {
                    hasSucceeded = false;

                    displayActual.message = wrapTypeIndicator("OBJECT");
                    displayExpected.message = wrapTypeIndicator("TEXT");
                } else if(!isObject(actual.message) && isObject(expected.message)) {
                    hasSucceeded = false;

                    displayActual.message = wrapTypeIndicator("TEXT");
                    displayExpected.message = wrapTypeIndicator("OBJECT");
                } else if(JSON.stringify(actual.message) !== JSON.stringify(expected.message)) {
                    hasSucceeded = false;
                    
                    if(asText) {
                        const windowSize = 25;

                        const handleWhitespace = str => {
                            return expected.ignoreWhitespace
                            ? str.trim().replace(/\s+/g, " ")
                            : str;
                        };
                        actual.message = handleWhitespace(actual.message);
                        expected.message = handleWhitespace(expected.message);
                        
                        let mismatchIndex = 0;
                        while(actual.message.charAt(mismatchIndex)
                        === expected.message.charAt(mismatchIndex)) {
                            mismatchIndex++;
                        }

                        const offset = {
                            left: Math.max(0, mismatchIndex - windowSize),
                            right: mismatchIndex + windowSize
                        };

                        displayActual.message = [
                            mismatchIndex,
                            `${(offset.left > 0) ? "..." : ""}${actual.message.slice(offset.left, offset.right)}${(actual.message.length > offset.right) ? "..." : ""}`
                        ];

                        displayExpected.message = `${(offset.left > 0) ? "..." : ""}${expected.message.slice(offset.left, offset.right)}${(expected.message.length > offset.right) ? "..." : ""}`;
                    } else {
                        displayActual.message = actual.message;
                    }
                }
            }
            
            if(expected.headers) {
                for(let header in expected.headers) {
                    const normalizedHeader = header.toLowerCase();

                    if(actual.headers[normalizedHeader] != expected.headers[header]) {
                        hasSucceeded = false;

                        displayActual.headers = displayActual.headers || {};
                        displayExpected.headers = displayExpected.headers || {};
                        displayActual.headers[normalizedHeader] = actual.headers[normalizedHeader];
                        displayExpected.headers[normalizedHeader] = expected.headers[header];
                    }
                }
            }

            resolve({
                hasSucceeded,
                actual: formatDisplayObj(displayActual),
                expected: formatDisplayObj(displayExpected)
            });
        })
        .catch(err => {
            resolve({
                hasSucceeded: false,
                actual: `\x1b[31m${err.message}\x1b[0m`,
                expected: `\x1b[2m• ${actual.url.toString()}\x1b[0m\n\n${formatDisplayObj(expected)}`
            });
        });
    });
}

    
function isObject(value) {
    return !Array.isArray(value)
    && !["string", "number", "boolean"].includes(typeof(value));
}

function performRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const req = ((endpoint.url.protocol.toLowerCase() === "https")
        ? https
        : http)
        .request({
            hostname: endpoint.url.hostname,
            port: endpoint.url.port,
            path: endpoint.url.href,
            method: endpoint.method || "GET",
            headers: endpoint.headers || {}
        }, res => {
            res.on("data", message => {
                message = String(message);
                
                resolve({
                    headers: res.headers,
                    status: res.statusCode,
                    message: {
                        json: _ => JSON.parse(message),
                        text: _ => message
                    }
                });
            });
        });

        req.on("error", err => {
            reject(err);
        });

        endpoint.body
        && req.write(JSON.stringify(endpoint.body));

        req.end();
    });
}

function wrap(str, code){
    return `${
        (!Array.isArray(code) ? [ code ] : code)
        .map(c => `\x1b[${c}m`)
        .join("")
    }${str}\x1b[0m`
}

function formatObj(obj) {
    return JSON.stringify(obj)
    .replace(/:(("|')[^"']+\2|[0-9]+)/g, m => {
        const rawValue = m.slice(1).replace(/^["']|["']$/g, "");
        const value = isNaN(rawValue)
        ? wrap(`"${rawValue}"`, 32)
        : wrap(rawValue, "38:5:214");

        return `:${value}`;
    })
    .replace(/("|')[^"']+\1:/g, m => `${wrap(m.slice(0, -1), 36)}${wrap(":", 2)} `)
    .replace(/\{/g, `${wrap("{", 2)}\n  `)
    .replace(/\}/g, `\n${wrap("}", 2)}`)
    .replace(/,/g, ",\n  ");
}

function formatDisplayObj(displayObj) {
    const wrapCaption = str => wrap(`– ${str.charAt(0).toUpperCase()}${str.slice(1)}:`, [2, 33]);

    const log = [];

    displayObj.status
    && log.push(
        `${wrapCaption("status")} ${wrap(displayObj.status, 36)}`
    );

    displayObj.message
    && log.push(`${wrapCaption("message")}${
        Array.isArray(displayObj.message)
        ? `${wrap(`At position ${displayObj.message[0]}`, 31)}\n${
                displayObj.message[1].slice(0, displayObj.message[0])
            }${wrap("^^^", 31)}${
                displayObj.message[1].slice(displayObj.message[0])
            }`
        : isObject(displayObj.message)
            ? formatObj(displayObj.message)
            : `${
                ((displayObj.message.length > 25) || (displayObj.message.indexOf("\n") >= 0))
                ? "\n" : " "
            }${displayObj.message}`
    }`);

    displayObj.headers
    && log.push(`${wrapCaption("headers")}\n${
        formatObj(displayObj.headers)
    }`);
    
    return log.join("\n");
}