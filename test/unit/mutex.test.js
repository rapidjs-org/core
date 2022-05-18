
const mutex = require("../../debug/A:app/mutex").memspaceMutex;


let referenceVar = false;

const mutexLockTest = new UnitTest("Mutex lock test", _ => referenceVar);


mutex.lock(_ => {
    const refTime = new Date().getTime() + 500;
    
    while (new Date().getTime() < refTime) {}

    referenceVar = true;
});

mutex.lock(_ => {
    mutexLockTest
    .conduct("Mutex lock callback with estimated ~500ms deferral")
    .check().for(true);
});