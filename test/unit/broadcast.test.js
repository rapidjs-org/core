const { BroadcastEmitter, BroadcastAbsorber } = require("../../debug/Broadcast");


let broadcastHasSent = false;
let broadcastHasReceived = false;

const testEmitter = new BroadcastEmitter(message => {
	broadcastHasSent = true;

    broadcastAbsorber.absorb(message);
});
const broadcastAbsorber = new BroadcastAbsorber();

broadcastAbsorber.on("*", message => {
    broadcastHasReceived = (message.signal === "test-signal-ignore");
});

assert("Check if broadcast has not emitted yet", broadcastHasSent, false);

testEmitter.emit({
    signal: "test-signal-ignore",
    data: 1
});

setImmediate(_ => {
    assert("Check if broadcast has emitted", broadcastHasSent, true);

    assert("Check if broadcast has absorbed incorrect signal", broadcastHasReceived, false);

    testEmitter.emit({
        signal: "test-signal",
        data: 1
    });

    setImmediate(_ => assert("Check if broadcast has absorbed correct signal", broadcastHasReceived, true));
});