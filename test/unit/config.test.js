const { writeFileSync } = require("fs");
const { join } = require("path");


const configObjects = {
    shared: {
        foo: "!!!",
        bar: true,
        baz: 1,
        qux: [
            1, 2, 3
        ]
    },
    prod: {
        foo: "Hello world",
        quux: {
            foo:  "Hello universe"
        }
    }
};


writeFileSync(join(__dirname, "../.tmp/rapidjs.config.json"), JSON.stringify(configObjects.shared));
writeFileSync(join(__dirname, "../.tmp/rapidjs.config.prod.json"), JSON.stringify(configObjects.prod));


const { ETypeConstraint, APP_CONFIG, constrain } = require("../../debug/Config/APP_CONFIG");
console.log(APP_CONFIG);    // TODO: Fix deep equal issue

assert("Read app config", APP_CONFIG, {
    ...configObjects.shared,
    ...configObjects.prod
});

let constrainingSucceeded;
try {
    constrain({
        foo: {
            type: ETypeConstraint.STRING,
            pattern: /[a-z ]+/
        },
        bar: ETypeConstraint.BOOLEAN,
        baz: ETypeConstraint.NUMBER,
        qux: ETypeConstraint.ARRAY_NUMBER,
        fred: {
            type: ETypeConstraint.ANY,
            required: false
        }
    });

    constrainingSucceeded = true;
} catch { /**/ }

assert("Constrain app config", constrainingSucceeded, true);