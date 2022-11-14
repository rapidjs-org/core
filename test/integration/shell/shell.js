const rJS_core = require("../../../debug/api");


rJS_core.shellAPI.bindRequestHandler("./request-handler"); // TODO: Typings
// TODO: How to pass shell API?


module.exports = rJS_core.individualAPI;   // TODO: Exports passthrough