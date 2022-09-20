require("./test-framework.js")("./unit/", "Unit Tests", [ 139, 106, 220 ], assert);

function assert(actual, expected) {
    return new Promise(resolve => {
        (!(actual instanceof Promise)
        ? new Promise(r => r(actual))
        : actual)
        .then(actual => {
            resolve({
                hasSucceeded: (actual === expected),
                actual, expected
            });
        });
    });
}