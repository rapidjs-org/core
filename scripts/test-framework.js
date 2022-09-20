const { join } = require("path");
const { readdirSync } = require("fs");


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
    queue: [],
    stackSize: 0
};


process.on("exit", _ => {
    const resultIndicatorSubstring = "\x1b[2m➞  \x1b[0m";
    const ratioSubstring = `(${testCounter.succeeded}/${testCounter.failed + testCounter.succeeded})`;

    if(testCounter.failed > 0) {
        console.error(`${resultIndicatorSubstring}${commonSubstring.cross} Test run \x1b[5m\x1b[31mfailed\x1b[0m ${ratioSubstring}.\n`);

        process.exit(1);
    }

    console.log(`${resultIndicatorSubstring}${commonSubstring.tick} Test run \x1b[5m\x1b[32msucceeded\x1b[0m ${ratioSubstring}.\n`);
});


function logBadge(message, colorRgb, suffix) {
    const fgDirective = (colorRgb.reduce((p, c) => p + c, 0) < ((3 * 256) / 1.25))
    ? "\x1b[38;2;255;255;255m" : "";

    console.log(`${fgDirective}\x1b[1m\x1b[48;2;${colorRgb[0]};${colorRgb[1]};${colorRgb[2]}m ${message} \x1b[0m${suffix ? ` ${suffix}` : ""}\n`);
}

function run(path, captionMessage, captionColorRgb, specificAssert) {
    if(testRange.stackSize > 0) {
        testRange.queue.push([ path, captionMessage, captionColorRgb, specificAssert ]);

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
            
            if(--testRange.stackSize === 0
            && testRange.queue.length > 0) {
                run.apply(null, testRange.queue.shift());
            }
        });
    };

    path = join(__dirname, "../test/", path);
    readdirSync(path, {
        withFileTypes: true
    })
    .filter(dirent => dirent.isFile())
    .forEach(dirent => {
        require(join(path, dirent.name));
    });
}


module.exports = run;