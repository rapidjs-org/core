
const { join } = require("path");
const { existsSync, readdir } = require("fs");


/*
 * Retrieve optional test file directory passed as CLI argument (first).
 */
let testDirPath = (process.argv.slice(2)[0] || "./test");
testDirPath = (testDirPath.charAt(0) != "/")
? join(process.cwd(), testDirPath)
: testDirPath;

/*
 * Color format enum. 
 */
const Color = {
    WHITE: [255, 255, 255],
    GRAY: [220, 220, 235],
    RED: [235, 81, 96],
    GREEN: [138, 249, 201],
    BLUE: [133, 169, 255]
};


/*
 * Console object overrides for formatted application output.
 */
const _log = console.log;
let lastOutFromApp = false;
const wrapLog = method => {
    return (...args) => {
        if(lastOutFromApp) {
            lastOutFromApp = false;

            _log("");
        }

        method(...args);
    }
};
const out = {
    log: wrapLog(console.log),
    error: wrapLog(console.error),
    group: wrapLog(console.group),
    groupEnd: wrapLog(console.groupEnd)
};
console = {};
console.log = (...msg) => {
    // TODO: Object log?

    _log(formatStr(`${!lastOutFromApp ? "\n─── app log ───\n" : ""}${msg.join(" ")}`, Color.GRAY, null, 2, 73));
    
    lastOutFromApp = true;
}
console.info = console.log;
console.warn = console.log;
console.error = console.log;


// INITIATE TEST SUITE EXECUTION
performTestAction("setup");
testDirectory(testDirPath);


/**
 * Perform test related action by evaluating an accordingly named file in the test directory (test.<name>.js) (top-level).
 * @param {String} name Action name
 */
function performTestAction(name) {
    const actionFilePath = join(testDirPath, `test.${name}.js`);

    if(!existsSync(actionFilePath)) {
        return;
    }

    out.log(`\n${formatStr(` TEST ${name.toUpperCase()} `, Color.WHITE, Color.GRAY, 1)}`);

    require(actionFilePath);
}

/**
 * ANSI format a string.
 * @param {String} str String to manipulate
 * @param {Color} [rgbFg] Optional foreground color (RGB array)
 * @param {Color} [rgbBg] Optional background color (RGB array)
 * @param  {...Number} [optionalCodes] Arbitrary amount of additional, optional format codes
 * @returns {String} Formatted string
 */
function formatStr(str, rgbFg, rgbBg, ...optionalCodes) {
    return `${rgbFg ? `\x1b[38;2;${rgbFg.join(";")}m` : ""}${rgbBg ? `\x1b[48;2;${rgbBg.join(";")}m` : ""}${(optionalCodes || []).map(code => `\x1b[${code}m`).join("")}${str}\x1b[0m`;
}

function getStrFrame(str, char = "─") {
    return formatStr(Array.from({ length: --str.replace(/(\\n|\x1b\[[0-9;]+m)/gi, "").length }).join(char), Color.GRAY, null, 2);
}

/*
 * Close with message and code according to test results.
 */
process.on("exit", _ => {
    performTestAction("cleanup");

    const closingFrame = str => {
        return `\n${getStrFrame(str)}\n${str}\n`;
    };

    // Error has occurred throughout test suite execution
    if(Test.hasError) {
        out.log(closingFrame(`\n• ${formatStr("Test suite aborted due to an error.\n", Color.RED)}`));

        return;
    }

    const appendix = ` (${formatStr(Test.resultCount.succeeded, Color.BLUE)}/${formatStr(Test.resultCount.succeeded + Test.resultCount.failed, Color.BLUE)} successful)`;

    // At least one test has failed => FAILURE
    if(Test.resultCount.failed > 0) {
        out.log(closingFrame(`\n➜ ${formatStr("Test suite failed", Color.RED)}${appendix}.\n`));
        
        process.exit(1);
    }

    // No test has failed => SUCCESS
    out.log(closingFrame(`\n➜ ${formatStr("Test suite succeeded", Color.GREEN)}${appendix}.\n`));
});


/**
 * (Abstract) test class to be extended with concrete application and result comparison behavior.
 * @abstract
 * @class
 */
class Test {
    static hasError = false;
    static instanceCount = 0;
    static lastActive;
    static resultCount = {
        succeeded: 0,
        failed: 0
    };
    static Equality = {
        FULL: 0,
        HALF: 1,
        NONE: 3
    };

    constructor(purposeDescriptor, callReference) {
        this.curSection = 0;
        this.id = Test.instanceCount++;

        this.callReference = callReference;
        this.purposeDescriptor = purposeDescriptor || `Test ${this.id}`;
    }

    /**
     * Call reference object for a concrete test case reference.
     * @interface
     */
    call(...args) {
        throw new SyntaxError("call() method must be implemented on extending Test class");
    }

    /**
     * Compare an expected with an actual result value.
     * @interface
     */
    compare(expected, actual) {
        throw new SyntaxError("compare() method must be implemented on extending Test class");
    }

    conduct(purposeDescriptor) {
        return {
            check: (...args) => {
                let actualResult = this.call(...args);

                return {
                    for: async expectedResult => {
                        (actualResult instanceof Promise)
                        && (actualResult = await actualResult);

                        if(Test.lastActive != this.id) {
                            out.log(`\n${formatStr(` ${this.purposeDescriptor}${(this.curSection++ > 0) ? ` (${this.curSection})`: ""} `, Color.WHITE, Color.BLUE, 1)}\n`);
                        }
                        Test.lastActive = this.id;
                        
                        const equality = this.compare(expectedResult, actualResult);

                        if(equality == Test.Equality.FULL) {
                            out.log(formatStr(`✔ ${purposeDescriptor}`, Color.GREEN));
                            
                            Test.resultCount.succeeded++;

                            return;
                        }

                        const failMessage = formatStr(`✘ ${purposeDescriptor}`, Color.RED);
                        const failFrame = getStrFrame(failMessage);

                        out.group(failMessage);
                        out.log(formatStr("\nExpected result:", Color.GRAY));
                        out.log(expectedResult);
                        out.log(formatStr("\nActual result:", Color.GRAY));
                        out.log(actualResult);
                        out.log(failFrame);
                        equality == Test.Equality.HALF && out.log(formatStr("\nType mismatch", Color.GRAY));
                        out.groupEnd("");

                        Test.resultCount.failed++;
                    }
                };
            }
        };
    }
}


/**
 * Execute test suite located in a given directory.
 * @recursive
 * @param {String} dirPath Path to test (parent) directory
 */
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

            out.log(formatStr(`\n• ${curFilePath.match(/[^/]+$/)[0]}`, Color.GRAY));
    
            try {
                require(curFilePath);
            } catch(err) {
                out.error(err);

                Test.hasError = true;

                process.exit(1);
            }
        });
    });
}


/*
 * Implementation interface.
 */
module.exports = out;
module.exports.formatStr = formatStr;
module.exports.Test = Test;