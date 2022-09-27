const { existsSync, mkdirSync, linkSync, copyFileSync, statSync, readdirSync, rmSync } = require("fs");
const { join } = require("path");
const { exec, execSync } = require("child_process");


const activeLangs = [ "TypeScript" ];
process.argv.slice(2).includes("--cpp")
&& activeLangs.push("C++");


log(`• WATCH COMPILE { ${activeLangs.join(", ")} }`);


// Create /debug files directory
createDir(join(__dirname, "../debug/"));
createDir(join(__dirname, "../debug/shared-memory/"));

!existsSync(join(__dirname, "../debug/help.txt"))
&& linkSync(join(__dirname, "../src/help.txt"), join(__dirname, "../debug/help.txt"));


let tsLogGroupOpen;

// Start TypeScript compiler (sub-)process in background
const child = exec(`tsc -w --preserveWatchOutput --outDir ${join(__dirname, "../debug/")}`);
// Adopt TypeScript compiler output
child.stdout.on("data", data => {
    if(/[0-9]{2}:[0-9]{2}:[0-9]{2} \- File change detected\. Starting incremental compilation\.\.\./.test(data)
    || /[0-9]{2}:[0-9]{2}:[0-9]{2} \- Starting compilation in watch mode\.\.\./.test(data)) {
        return;
    }
    
    !tsLogGroupOpen
    && logBadge("TypeScript", [ 23, 155, 231 ]);
    console.log(`${
        (tsLogGroupOpen && !/^[0-9]{2}:[0-9]{2}:[0-9]{2} \-/.test(data))
        ? "\n" : ""
    }${data.trim()}`);

    tsLogGroupOpen = true;
});


// Set up shared memory files / C++ source modification watch
const detectionFrequency = 2500;
const shmPath = join(__dirname, "../src/shared-memory/");
const shmDirents = readdirSync(shmPath, {
    withFileTypes: true
})
.filter(dirent => dirent.isFile())
.filter(dirent => !/\.ts$/.test(dirent.name));

activeLangs.includes("C++")
&& setInterval(_ => {
    for(const dirent of shmDirents) {
        if(!shmFileModified(join(shmPath, dirent.name))) {
            continue;
        }

        compileCPP();

        return;
	}
}, detectionFrequency);

// Initially compile C++ source
compileCPP();


function log(message) {
    process.stdout.write(`\x1b[2m${message}\n${Array.from({ length: message.length }, _ => "‾").join("")}\x1b[0m`);
}

function logBadge(message, colorRgb) {
    console.log(`\n\x1b[1m\x1b[48;2;${colorRgb[0]};${colorRgb[1]};${colorRgb[2]}m\x1b[38;2;255;255;255m ${message} \x1b[0m\n`);
}

function createDir(path) {
    !existsSync(path) && mkdirSync(path);
}

function compileCPP() {
    logBadge("C++", [ 220, 65, 127 ]);

    try {
        execSync("node-gyp build", {
            cwd: shmPath,
            stdio: "inherit"
        });
        
        const destPath = join(__dirname, "../debug/shared-memory/shared-memory.node");
        rmSync(destPath, {
            force: true
        });
        copyFileSync(join(shmPath, "./build/Release/shared_memory.node"),
                     destPath);
    } catch(err) { /**/ }

    tsLogGroupOpen = false;
}

function shmFileModified(path) {
    const fileModified = time => {
        return (Math.abs(time - Date.now()) < detectionFrequency);
    };

    const stats = statSync(path);

    return (fileModified(stats.birthtime) || fileModified(stats.mtimeMs));
}