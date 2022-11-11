const { ErrorMonitor } = require("../../debug/ErrorMonitor");


let monitorHasActivated = false;

const testErrorMonitor = new ErrorMonitor(() => {
	monitorHasActivated = true;
}, null, 1);


assert("Check if error monitor has not activated yet", monitorHasActivated, false);

testErrorMonitor.feed();
testErrorMonitor.feed();
testErrorMonitor.feed();

setImmediate(_ => assert("Check if error monitor has activated", monitorHasActivated, true));