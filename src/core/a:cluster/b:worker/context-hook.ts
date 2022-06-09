/**
 * Module containing a globally effective hook interface for accessing an
 * original server response object from anywhere inside of an asynchronous
 * handler routine.
 */


import { ServerResponse } from "http";
import { AsyncHook, createHook, executionAsyncId } from "async_hooks";

import { IContext } from "./interfaces";


const context = new Map<number, IContext>();	// Open original response storage

const asyncHook: AsyncHook = createHook({
	init: (asyncId, _, triggerAsyncId) => {
		context.has(triggerAsyncId)
        && context.set(asyncId, context.get(triggerAsyncId));
	},
	destroy: asyncId => {
		context.has(asyncId)
		&& context.delete(asyncId);
	}
});


asyncHook.enable();


/**
 * Create async handler associated original response hook.
 * @param {ServerResponse} oRes Original response object
 */
export function hookContext(url: string, oRes: ServerResponse, encode: string, headersOnly: boolean = false) {
	context.set(executionAsyncId(), {
		url, oRes, encode, headersOnly
	});
}

/**
 * Get currently effective request info object (based on asynchronous thread).
 * Uses automatic context deduction if not given a specific async execution id
 * @param {number} [asyncId] Manually specified async execution id
 * @returns {IRequestObject} Reduced request info object
 */
export function getContext(asyncId?: number): IContext {
	return context.get(asyncId || executionAsyncId());
}

/**
 * Get the current context async execution id
 * @returns {number} Async execution id
 */
export function getContextId(): number {
	return executionAsyncId();
}