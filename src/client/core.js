var rapidJS = {};
rapidJS.core = (_ => {
	let isCompound;

	document.addEventListener("DOMContentLoaded", _ => {
		// Fix anchor links' base for compound pages
		isCompound = document.head.querySelector("base")
		? true	// Most likely (if base tag hasn't been provided manually, causes hidden overhead only)
		: false;	// TODO: Enhance compound page detection (without providing an identifier)
		
		if(!isCompound) {
			return;
		}

		// Listen for possible actions and update href once anchor link is used before resolves
		const adaptAnchor = target => {
			const href = target.getAttribute("href");
			if(target.tagName.toLowerCase() !== "a"
			|| !/^#/.test(href)) {
				return;
			}

			target.setAttribute("href", `${document.location.pathname}${href}`);
			// Inherently isolated from being worked again
		};

		document.body.addEventListener("mousedown", e => { adaptAnchor(e.target); });
		document.body.addEventListener("keydown", _ => { adaptAnchor(document.activeElement); });
	});


	const performRequest = (method, body) => {
		return fetch(document.location.pathname, {
			// Perform request to same path to keep document environment (e.g. for cookies)
			method: method,
			mode: "same-origin",
			credentials: "same-origin",
			headers: {
				"Content-Type": "application/json"
			},
			redirect: "follow",
			referrerPolicy: "no-referrer",
			body: JSON.stringify(body)
		});
	};

	const PUBLIC = {};

	/**
	 * Perform request ro plug-in related endpoint (id set up).
	 * @param {String} pluginName Internal name of plug-in to be addressed
	 * @param {Object} [body] Body object to send along being passed to the endpoint callback
	 * @param {Function} [progressHandler] Callback repeatedly getting passed the current loading progress [0, 1]
	 * @param {String} [endpointName] Endpoint name if given
	 * @returns {Promise} Request promise eventualy resolving to response message
	 */
	PUBLIC.toEndpoint = (pluginName, body, progressHandler, endpointName) => {
		return new Promise((resolve, reject) => {
			performRequest("POST", {
				body: body,
				pluginName: pluginName,
				endpointName: endpointName || null
			}).then(async res => {
				// Explicitly download body to handle progress
				const contentLength = res.headers.get("Content-Length");
				let receivedLength = 0;

				const reader = res.body.getReader();
				let chunks = [];
				let curChunk;
				while((curChunk = await reader.read()) && !curChunk.done) {
					applyProgressHandler(receivedLength / contentLength);

					receivedLength += curChunk.value.length;
					chunks.push(curChunk.value);
				}
				applyProgressHandler(1);
				
				let chunksAll = new Uint8Array(receivedLength);
				let position = 0;
				for(let chunk of chunks) {
					chunksAll.set(chunk, position);
					position += chunk.length;
				}
				
				let message = new TextDecoder("utf-8").decode(chunksAll);
				try {
					message = JSON.parse(message);
				} catch(_) {
					message = String(message);
				}
				
				((res.status - 200) < 99) ? resolve(message) : reject(message);
			}).catch(err => {
				reject((err instanceof NetworkError) ? new NetworkError(`Could not reach endpoint${endpointName ? ` '${endpointName}'` : ""} for '${pluginName}'`) : err);
			});
		});

		function applyProgressHandler(progress) {
			try {
				progressHandler && progressHandler(progress);
			} catch(err) {
				console.error(err);
			}
		}
	};


	/* window.onunhandledrejection = e => {
		console.warn(e.reason);	// How to determine source?
	};
	
	window.onerror = function(_, __, ___, ____, error) {
		console.warn(error);
	}; */

	/**
	 * Class representing an individual client error.
	 * Instance to be thrown (uncaught) for a respective redirection.
	 * Augments server-side equivalent.
	 * TODO: Implement correctly
	 */
	PUBLIC.ClientError = class {
		/**
		 * @param {number} status Status code (within client error code range (4**))
	 	 * @param {string} message Optional description message
		 */
		constructor(status, message) {
			this.status = status;
			this.message = message;
		}
	};


	// TODO: Emit event once for each plug-in upon has loaded


	return PUBLIC;
})();