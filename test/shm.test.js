const sharedMemory = require("../debug/shared-memory/shared-memory-api");


setInterval(_ => {}, 5000); // Keep alive


process.on("message", consistencyStr => {
    const referenceData = `Hello worlδ! ${consistencyStr}`;
        // with 2B delta character (uint16(to 2x8) split) and random part in order to ensure consitency among runs

    if(!process.argv.slice(2).includes("--read")) {
        // WRITE PARTY
        sharedMemory.writeSync("existing", referenceData);
        
        log(`[ SHM : ${sharedMemory.getAppKey()} : "existing" ] WRITE -> '${referenceData}'`);

        return;
    }

    // READ PARTY
    setTimeout(_ => {
        try {
            const dataExisting = sharedMemory.readSync("existing");
            log(`[ SHM : ${sharedMemory.getAppKey()} : "existing" ] READ -> '${dataExisting}'`);

            const dataNonExisting = sharedMemory.readSync("nonExisting");
            log(`[ SHM : ${sharedMemory.getAppKey()} : "nonExisting" ] READ -> ${dataNonExisting}`);

            process.send(
                dataExisting === referenceData
                && dataNonExisting === null
            );    // Result
        } catch(err) {
            console.error(err);
        }
    }, 1000);
});


function log(message) {
    console.log(`\x1b[2m${message}\x1b[0m`);
}