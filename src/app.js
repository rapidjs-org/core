/**
 * @copyright Thassilo Martin Schiepanski
 * @author Thassilo Martin Schiepanski
 */


require("./server/instance.js");


// Application specific core interface; accessible from the instanciating application's scope
module.exports = require("./interface:app");

// TODO: Wildcard templating?
// TODO: Implement defer option for plug-in client module loading
// TODO: Auto script, styles bundling?