const rJS = require("../../../debug/api");


rJS.bindRequestHandler("./request-handler"); // TODO: Typings


rJS.broadcast("awdawd", "awdawd");
setTimeout(() => rJS.broadcast("ttt", "awdawd"), 4500);

module.exports = rJS;   // TODO: Exports passthrough