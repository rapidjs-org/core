const sharedMemory = require("../debug/shared-memory/shared-memory-api");


const referenceData = {
    "existing": "Hello worlδ!",   // with 2B delta character (uint8 split)
    "nonExisting": "foo"
};


setInterval(_ => {}, 5000); // Keep alive


if(process.argv.slice(2).includes("--read")) {
    // READ PARTY
    setTimeout(_ => {
        try {
            const dataExisting = sharedMemory.read("existing");
            log(`[ SHM : ${sharedMemory.getAppKey()} : "existing" ] READ -> '${dataExisting}'`);

            const dataNonExisting = sharedMemory.read("nonExisting");
            log(`[ SHM : ${sharedMemory.getAppKey()} : "nonExisting" ] READ -> ${dataNonExisting}`);

            process.send(
                dataExisting === referenceData.existing
                && dataNonExisting === null
            );    // Result
        } catch(err) {
            console.error(err);
        }
    }, 1000);
} else {
    // WRITE PARTY
    sharedMemory.write("existing", referenceData.existing)
    .then(_ => {
        log(`[ SHM : ${sharedMemory.getAppKey()} : "existing" ] WRITE -> '${referenceData.existing}'`);
    })
    .catch(err => {
        console.error(err);
    });
}


function log(message) {
    console.log(`\x1b[2m${message}\x1b[0m`);
}