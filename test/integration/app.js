const rJS = require("./shell/shell");


rJS.on("listening", _ => {
    try { process.send(0); } catch { /**/ }
});


rJS.on("request", data => rJS.print.logToFile(data));
rJS.on("response", data => rJS.print.logToFile(data));