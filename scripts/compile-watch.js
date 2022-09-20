const { existsSync, mkdirSync, linkSync, statSync, readdirSync } = require("fs");
const { join } = require("path");
const { exec, execSync } = require("child_process");


let tsLogGroupOpen;


log("• WATCH COMPILE { C++, TypeScript }");

// Create /debug files directory
createDir(join(__dirname, "../debug/"));
createDir(join(__dirname, "../debug/shared-memory/"));

// Initially compile C++ source
compileCPP();

// Create hard link to compiled module in source in order to keep updates
const linkDest = join(__dirname, "../debug/shared-memory/shared-memory.node");
!existsSync(linkDest)
&& linkSync(join(__dirname, "../src/shared-memory/build/Release/shared_memory.node"), );

// Start TypeScript compiler (sub-)process in background
const child = exec(`tsc -w --preserveWatchOutput --outDir ${join(__dirname, "../debug/")}`);
setTimeout(_ => {
    // Adopt TypeScript compiler output
    child.stdout.on("data", data => {
        if(/[0-9]{2}:[0-9]{2}:[0-9]{2} \- File change detected\. Starting incremental compilation\.\.\./.test(data)) {
            return;
        }
        
        !tsLogGroupOpen && logBadge("TypeScript Compile");
        console.log(data.trim())

        tsLogGroupOpen = true;
    });
}, 1000);


// Set up shared memory files / C++ source modification watch
const detectionFrequency = 2500;
const shmPath = join(__dirname, "../src/shared-memory/");
const shmDirents = readdirSync(shmPath, {
    withFileTypes: true
})
.filter(dirent => dirent.isFile());
setInterval(_ => {
    for(const dirent of shmDirents) {
        if(!shmFileModified(join(shmPath, dirent.name))) {
            continue;
        }

        compileCPP();

        return;
	}
}, detectionFrequency);


function log(message) {
    console.log(`\x1b[2m${message}\n${Array.from({ length: message.length }, _ => "‾").join("")}\x1b[0m`);
}

function logBadge(message) {
    console.log(`\x1b[1m\x1b[46m\x1b[38;2;255;255;255m ${message} \x1b[0m\n`);
}

function createDir(path) {
    !existsSync(path) && mkdirSync(path);
}

function compileCPP() {
    logBadge("C++ Compile");

    try {
        execSync("node-gyp build", {
            cwd: shmPath,
            stdio: "inherit"
        });
    } catch { /**/ }

    tsLogGroupOpen = false;
}

function shmFileModified(path) {
    const fileModified = time => {
        return (Math.abs(time - Date.now()) < detectionFrequency);
    };

    const stats = statSync(path);

    return (fileModified(stats.birthtime) || fileModified(stats.mtimeMs));
}