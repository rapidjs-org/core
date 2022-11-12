const { join } = require("path");
const { fork } = require("child_process");


const children = [];
const randomConsistencyStr = Math.round(Math.random() * 100);


children.push(detachProcess("write"));
children.push(detachProcess("read"));


function detachProcess(mode) {
    const child = fork(join(__dirname, "../test/shm.test.js"), [ `--${mode}` ]);
    
    child.on("message", ioMatches => {
        children.forEach(child => child.kill());
        
        if(!ioMatches) {
            console.error("\n\x1b[31m✗\x1b[0m Shared Memory I/O test has \x1b[31mfailed\x1b[0m.\n");

            process.exit(1);
        }

        console.log("\n\x1b[32m✓\x1b[0m Shared Memory I/O test has \x1b[32msucceeded\x1b[0m.\n");

        process.exit(0);
    });

    child.send(randomConsistencyStr);

    return child;
}