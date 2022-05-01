
const { join } = require("path");
const { readdir } = require("fs");


let testDirPath = (process.argv.slice(2)[0] || "./test");
testDirPath = (testDirPath.charAt(0) != "/")
? join(process.cwd(), testDirPath)
: testDirPath;


const oLog = console.log;
console.log = (...msg) => {
    // TODO: Object log?
    oLog(`\n===\n${formatStr(msg.join(" "), 90)}\n===\n`);
}


process.on("exit", _ => {
    oLog("");

    if(Test.hasError) {
        oLog(formatStr("Test suite aborted due to an error", 31));

        return 2;
    }

    const appendix = ` (${Test.resultCount.succeeded}/${Test.resultCount.succeeded + Test.resultCount.failed} successful)`;

    if(Test.resultCount.failed > 0) {
        oLog(`${formatStr("Test suite failed", 31)}${appendix}`);
        
        return 1;
    }

    oLog(`${formatStr("Test suite succeeded", 32)}${appendix}`);

    return 0;
});


/* global.test = function(sourceFilePath, options = {}) {
    require(join(testDirPath, sourceFilePath).replace(/(\.js)?$/i, ".js"));
} */

global.Test = class {
    static hasError = false;
    static instanceCount = 0;
    static lastActive;
    static resultCount = {
        succeeded: 0,
        failed: 0
    };

    constructor(method, purposeDescriptor) {
        this.curSection = 0;
        this.id = Test.instanceCount++;

        this.method = method;
        this.purposeDescriptor = purposeDescriptor || `Test ${this.id}`;
    }

    conduct(purposeDescriptor) {
        return {
            check: (...args) => {
                if(Test.lastActive != this.id) {
                    oLog(`\n${formatStr(` ${this.purposeDescriptor}${(this.curSection++ > 0) ? ` (${this.curSection})`: ""} `, 93, 46)}\n`);
                }
                Test.lastActive = this.id;

                const actualResult = this.method(...args);

                return {
                    for: expectedResult => {
                        // TODO: Object equal
                        if(expectedResult === actualResult) {
                            oLog(`${formatStr("+", 32)} ${purposeDescriptor}`);
                            
                            Test.resultCount.succeeded++;

                            return;
                        }

                        oLog(formatStr(`x ${purposeDescriptor}`, 31));
                        oLog(`Expected result: ${expectedResult}. Actual result: ${actualResult}.`);
                        (expectedResult == actualResult) && oLog(formatStr("Type mismatch", 39));
                        // TODO: Object log?
                        
                        Test.resultCount.failed++;
                    }
                };
            }
        };
    }
}


function formatStr(str, ...codes) {
    return `${(codes || []).map(code => `\x1b[${code}m`).join("")}${str}\x1b[0m`;
}

function testDirectory(dirPath) {
    readdir(dirPath, {
        withFileTypes: true
    }, (_, dirents) => {
        (dirents || []).forEach(dirent => {
            const curFilePath = join(dirPath, dirent.name);

            if(dirent.isDirectory()) {
                testDirectory(curFilePath);

                return;
            }

            if(!/\.test\.js$/.test(dirent.name)) {
                return;
            }

            conductTest(curFilePath);
        });
    });
}

function conductTest(testFilePath) {
    oLog(`${formatStr(testFilePath.match(/[^/]+$/)[0], 97)}`);
    
    try {
        require(testFilePath);
    } catch(err) {
        oConsole.error(err);

        Test.hasError = true;

        process.exit(1);
    }
}


testDirectory(testDirPath);