const { run, deepIsEqual } = require("./test-framework.js");

run("./unit/", "Unit", [ 139, 106, 220 ], assert);

function assert(actual, expected) {
    return new Promise(resolve => {
        (!(actual instanceof Promise)
        ? new Promise(r => r(actual))
        : actual)
        .then(actual => {
            resolve({
                hasSucceeded: (JSON.stringify(actual) === JSON.stringify(expected)),
                actual, expected
            });
        });
    });
}