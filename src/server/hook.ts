/**
 * Request/response entity management using the asynchronous hook API
 * in order to identify entites across different modules based on the
 * currently active asynchronous thread.
 */


// Create and enable asynchronous hook
import asyncHooks from "async_hooks";


import { Entity } from "./entity/Entity";

// TODO: Static member of Entity?

const requests = new Map();

const asyncHook = asyncHooks.createHook({
	init: (asyncId, _, triggerAsyncId) => {
		requests.has(triggerAsyncId)
        && requests.set(asyncId, requests.get(triggerAsyncId));
	},
	destroy: asyncId => {
		requests.has(asyncId) && requests.delete(asyncId);
	}
});

asyncHook.enable();


/**
 * Create async thread hooked entity object.
 * @param {Entity} entity Request/response entity
 */
export function createHook(entity: Entity) {
	requests.set(asyncHooks.executionAsyncId(), entity);
}

/**
 * Get currently effective request info object (based on asynchronous thread).
 * Returns undefined if is not related to a request processing routine.
 * @returns {IRequestObject} Reduced request info object
 */
export function currentRequestInfo(): IRequestObject {
	const currentEntity = requests.get(asyncHooks.executionAsyncId());
	return currentEntity
		? currentEntity.getRequestObject()
		: undefined;
}