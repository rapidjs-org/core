"use strict";
/**
 * @class
 * Class representing a POST request specific entitiy.
 * To be exclusively used for plug-in channel maintenance.
 *
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostEntity = void 0;
const output = __importStar(require("../../utilities/output"));
const config_server_1 = __importDefault(require("../../config/config.server"));
const endpoint_1 = require("../../interface/plugin/endpoint");
const Entity_1 = require("./Entity");
class PostEntity extends Entity_1.Entity {
    /**
      * Create entity object based on web server induced request/response objects.
      * @param {IncomingMessage} req Request object
      * @param {ServerResponse} res Response object
      */
    constructor(req, res) {
        super(req, res);
    }
    /**
      * Close entity by performing a response with an individual message.
      * @param {number} status Status code
      * @param {Buffer} [message] Message data
      */
    respond(status, message) {
        // Perform definite response
        super.respond(status, message);
    }
    process() {
        const pluginName = this.url.pathname.replace(/^\//, ""); // Preserve actually requested pathname
        if (!(0, endpoint_1.has)(pluginName)) {
            // No related POST handler defined
            return this.respond(404);
        }
        let blockBodyProcessing = false;
        const body = [];
        this.req.on("data", chunk => {
            if (blockBodyProcessing) {
                // Ignore further processing as maximum payload has been exceeded
                return;
            }
            body.push(chunk);
            if ((body.length * 8) <= config_server_1.default.maxPayloadSize) {
                // Continue on body stream as payload limit not yet reached
                return;
            }
            // Abort processing as bdy payload exceeds maximum size
            // Limit to be optionally set in server configuration file
            this.respond(413);
            blockBodyProcessing = true;
        });
        this.req.on("end", () => {
            if (blockBodyProcessing) {
                // Ignore further processing as maximum payload has been exceeded
            }
            // Parse payload
            let bodyObj;
            try {
                bodyObj = (body.length > 0) ? JSON.parse(body.toString()) : null;
            }
            catch (err) {
                throw new SyntaxError(`Error parsing endpoint request body '${this.url.pathname}'`);
            }
            if (!(0, endpoint_1.has)(pluginName, bodyObj.name)) {
                // No related POST handler defined
                return this.respond(404);
            }
            try {
                // Adapt representing URL to the individual plug-in origin respective document URL
                this.url.pathname = bodyObj.meta.pathname;
                const data = (0, endpoint_1.use)(pluginName, bodyObj.body, bodyObj.name);
                this.respond(200, data);
            }
            catch (err) {
                output.error(err);
                this.respond(err.status, err.message);
            }
        });
        this.req.on("error", err => {
            throw err;
        });
    }
    getReducedRequestInfo() {
        const obj = super.getReducedRequestInfo();
        return Object.assign(Object.assign({}, obj), { isCompound: false });
    }
}
exports.PostEntity = PostEntity;
// TODO: Client error handling (throw approach)