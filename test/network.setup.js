const rJS = require("../debug/api");

rJS.on("listening", _ => {
    process.send(0);
});