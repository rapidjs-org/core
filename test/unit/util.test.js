const { join } = require("path");

const { mergeObj, absolutizePath } = require("../../debug/core/util");

const mergeObjTest = new UnitTest("Object merge tests", mergeObj);

mergeObjTest
.conduct("Merge two disjunctive objects")
.check({
    a: 1
}, {
    b: 2
})
.for({
    a: 1,
    b: 2
});

mergeObjTest
.conduct("Merge two intersecting objects")
.check({
    a: 1,
    b: 1
}, {
    b: 2,
    c: 2
})
.for({
    a: 1,
    b: 2,
    c: 2
});

mergeObjTest
.conduct("Merge three objects")
.check({
    a: 1,
    b: 1
}, {
    b: 2,
    c: 2
}, {
    c: 3,
    d: 3
})
.for({
    a: 1,
    b: 2,
    c: 3,
    d: 3
});


const { normalizeExtension } = require("../../debug/app/util");

const normalizeExtensionTest = new UnitTest("Normalize file extension tests", normalizeExtension);

normalizeExtensionTest
.conduct("Normalize file extension path")
.check(".html")
.for("html");

// TODO: Complete