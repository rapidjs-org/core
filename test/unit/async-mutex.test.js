const { AsyncMutex } = require("../../debug/AsyncMutex");

const pivot = new AsyncMutex();

let reference = false;


pivot.lock(_ => {
    return new Promise(resolve => {
        setTimeout(_ => {
            reference = true;

            resolve();
        }, 500);
    });
});

pivot.lock(_ => {   // Has to wait for previous lock to have evaluated / resolved
    assert("Check for correct mutex locked eventual reference assignment", reference, true);
});