"use strict";
/**
 * Request/response entity management using the asynchronous hook API
 * in order to identify entites across different modules based on the
 * currently active asynchronous thread.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentRequestInfo = exports.createHook = void 0;
// Create and enable asynchronous hook
const async_hooks_1 = __importDefault(require("async_hooks"));
const requests = new Map();
const asyncHook = async_hooks_1.default.createHook({
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
 * Create entity object based on web server induced request/response objects.
 * @param {Entity} entity Request/response entity
 */
function createHook(entity) {
    requests.set(async_hooks_1.default.executionAsyncId(), entity);
}
exports.createHook = createHook;
/**
 * Get currently effective request info object (based on asynchronous thread).
 * @returns {IReducedRequestInfo} Reduced request info object
 */
function currentRequestInfo() {
    return requests.get(async_hooks_1.default.executionAsyncId()).getReducedRequestInfo();
}
exports.currentRequestInfo = currentRequestInfo;