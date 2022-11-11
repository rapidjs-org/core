const { EVENT_EMITTER } = require("../../debug/EVENT_EMITTER");


let eventHasEmitted = false;

EVENT_EMITTER.on("test-event", _ => {
    eventHasEmitted = true;
});


assert("Check if event emitter has not activated yet", eventHasEmitted, false);

EVENT_EMITTER.emit("test-event");

setImmediate(_ => assert("Check if event emitter has activated", eventHasEmitted, true));