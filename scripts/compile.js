"use strict";


const { existsSync, mkdirSync, linkSync, copyFileSync, rmdirSync, rmSync } = require("fs");
const { join, dirname } = require("path");
const { execSync } = require("child_process");


function makeDir(path) {
    existsSync(path)
    && rmdirSync(path, {
        force: true,
        recursive: true
    });
    mkdirSync(path, {
        force: true,
        recursive: true
    });
}


module.exports.log = function(message) {
    process.stdout.write(`\x1b[2m${message}\n${Array.from({ length: message.length }, _ => "‾").join("")}\x1b[0m`);
}

module.exports.logBadge = function(message, colorRgb) {
    console.log(`\n\x1b[1m\x1b[48;2;${colorRgb[0]};${colorRgb[1]};${colorRgb[2]}m\x1b[38;2;255;255;255m ${message} \x1b[0m\n`);
}

module.exports.getSHMPath = function(dirName) {
    return {
        source: join(process.cwd(), "./src/core/shared-memory"),
        debug: join(process.cwd(), dirName, "./core/shared-memory")
    };
};

module.exports.compile = function(dirName) {
    const shmPath = module.exports.getSHMPath(dirName);

    makeDir(shmPath.debug);

    const helpTextPath = {
        source: join(process.cwd(), "./src/cli/_help.txt"),
        debug: join(process.cwd(), dirName, "/cli/_help.txt")
    };

    makeDir(dirname(helpTextPath.debug));
    !existsSync(helpTextPath.debug)
    && linkSync(helpTextPath.source, helpTextPath.debug);

    return module.exports.compileCPP(dirName);
};

module.exports.compileCPP = function(dirName) {
    module.exports.logBadge("C++", [ 220, 65, 127 ]);

    const shmPath = module.exports.getSHMPath(dirName);
    
    try {
        console.log(join(shmPath.source))
        execSync("node-gyp build", {
            cwd: join(shmPath.source),
            stdio: "inherit"
        });
        
        const destPath = join(shmPath.debug, "./shared-memory.node");
        rmSync(destPath, {
            force: true
        });
        copyFileSync(join(shmPath.source, "./build/Release/shared_memory.node"), destPath);
    } catch(err) {
        console.log(err);

        return 1;
    }

    return 0;
}