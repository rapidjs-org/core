const rJS = require("../../debug/api");

rJS.on("listening", _ => {
    try { process.send(0); } catch { /**/ }
});