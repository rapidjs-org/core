const { join } = require("path");
const { existsSync, mkdirSync, rmSync, readdirSync } = require("fs");


const commonSubstring = {
    cross: "\x1b[31m✗",
    tick: "\x1b[32m✓"
};
for(const substring in commonSubstring) {
    commonSubstring[substring] += "\x1b[0m";
}

const testCounter = {
    failed: 0,
    succeeded: 0
};

const testRange = {
    callQueue: [],
    stackSize: 0
};

const exitTimeoutLength = 3000;
let exitTimeout = null;

const tmpDirPath = join(__dirname, "../test/.tmp/");


!existsSync(tmpDirPath)
&& mkdirSync(tmpDirPath);


process.on("exit", code => {
    const resultIndicatorSubstring = "\x1b[2m➞  \x1b[0m";

    if(code !== 0) {
        console.log(`\n${resultIndicatorSubstring}${commonSubstring.cross} Test run has tertminated due to runtime error.\n`);

        return code;
    }

    const ratioSubstring = `(${testCounter.succeeded}/${testCounter.failed + testCounter.succeeded})`;

    if(testCounter.failed > 0) {
        console.error(`${resultIndicatorSubstring}${commonSubstring.cross} Test run \x1b[5m\x1b[31mfailed\x1b[0m ${ratioSubstring}.\n`);

        return 1;
    }

    console.log(`${resultIndicatorSubstring}${commonSubstring.tick} Test run \x1b[5m\x1b[32msucceeded\x1b[0m ${ratioSubstring}.\n`);
});

process.on("exit", cleanUp);
process.on("SIGINT", cleanUp);
process.on("SIGTERM", cleanUp);
process.on("uncaughtException", cleanUp);
process.on("unhandledRejection", cleanUp);


process.argv.push("--path");
process.argv.push("../test/.tmp");  // Set working directory arguments


// TODO: Mark app log / separate


function cleanUp() {
    existsSync(tmpDirPath)
    && rmSync(tmpDirPath, {
        recursive: true
    });
}

function logBadge(message, colorRgb, suffix) {
    const fgDirective = (colorRgb.reduce((p, c) => p + c, 0) < ((3 * 256) / 1.25))
    ? "\x1b[38;2;255;255;255m" : "";

    console.log(`${fgDirective}\x1b[1m\x1b[48;2;${colorRgb[0]};${colorRgb[1]};${colorRgb[2]}m ${message} \x1b[0m${suffix ? ` ${suffix}` : ""}\n`);
}

function isObject(value) {
    return !Array.isArray(value)
    && !["string", "number", "boolean"].includes(typeof(value));
}


module.exports.isObject = isObject;

module.exports.deepIsEqual = function(value1, value2) {
    if(!value1 || !value2) {
        return (value1 === value2);
    }
    if(!isObject(value1) && !isObject(value2)) {
        return Array.isArray(value1)
        ? (JSON.stringify(value1.sort()) === JSON.stringify(value2.sort()))
        : (value1 === value2);
    }

    for(const key in value1) {
        if((isObject(value1[key]) && !this.deepIsEqual(value1[key], value2[key]))
        || (Array.isArray(value1[key]) && !this.arraysEqual(value1[key], value2[key]))
        || value1[key] !== value2[key]) {
            return false;
        }
    }

    return true;
}

module.exports.run = function(path, captionMessage, captionColorRgb, specificAssert, useTimeout) {
    clearTimeout(exitTimeout);

    if(testRange.stackSize > 0) {
        testRange.callQueue.push([ path, captionMessage, captionColorRgb, specificAssert ]);
        
        return;
    }
    
    logBadge(captionMessage.toUpperCase(), captionColorRgb);

    global.assert = (caption, actual, expected) => { // =: assert equals
        testRange.stackSize++;
        
        const specificResult = specificAssert(actual, expected);
        
        (!(specificResult instanceof Promise)
        ? new Promise(r => r(specificResult))
        : specificResult)
        .then(specificResult => {
            const hasSucceeded = specificResult.hasSucceeded ?? specificResult;
            
            logBadge(`Case ${(testCounter.failed + testCounter.succeeded + 1)}`, [ 255, 249, 194 ], `${commonSubstring[hasSucceeded ? "tick" : "cross"]} \x1b[2m${caption}\x1b[0m`);

            testCounter[hasSucceeded ? "succeeded" : "failed"]++;

            if(!hasSucceeded) {
                console.group();
                
                const logValue = (caption, value) => {
                    console.log(`\x1b[48:5:253m\x1b[38;2;255;255;255m ${caption} \x1b[0m\n`);
                    console.log(value);
                    console.log("");
                };

                logValue("Expected", specificResult.expected || expected);
                logValue("Actual", specificResult.actual || actual);
                
                console.groupEnd();
            }
            
            if(--testRange.stackSize === 0 && testRange.callQueue.length) {
                run.apply(null, testRange.callQueue.shift());
            } else if(useTimeout) {
                exitTimeout = setTimeout(_ => process.exit(), exitTimeoutLength);
            }
        });
    };

    path = join(__dirname, "../test/", path);
    readdirSync(path, {
        withFileTypes: true
    })
    .filter(dirent => dirent.isFile())
    .forEach(dirent => {
        try {
            require(join(path, dirent.name));
        } catch(err) {
            console.error(err);

            process.exit(1);
        }
    });
};