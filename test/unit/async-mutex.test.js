const { AsyncMutex } = require("../../debug/AsyncMutex");

const testMutex = new AsyncMutex();


let reference = false;


assert("Check for correct eventual mutex lock", testMutex.lock(_ =>{
    return new Promise(resolve => {
        setTimeout(_ => {
            reference = false;

            resolve(reference);
        }, 200);
    });
}), false);

assert("Check for correct immediate mutex lock", testMutex.lock(_ =>{
    reference = true;
    
    return(reference);
}), true);