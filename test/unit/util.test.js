const { join } = require("path");


// MEM 0

const { mergeObj, absolutizePath } = require("../../debug/util");

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

const absolutizePathTest = new UnitTest("Absolutize path tests", absolutizePath);

absolutizePathTest
.conduct("Absolutize relative path (root appendix)")
.check("./def/ghj.txt", "/abc")
.for("/abc/def/ghj.txt");

absolutizePathTest
.conduct("Absolutize absolute path (unchanged)")
.check("/def", "/abc")
.for("/def");

// MEM A

const { normalizePath } = require("../../debug/A:app/util");

const normalizePathTest = new UnitTest("Project normalize path tests", normalizePath);

normalizePathTest
.conduct("Project normalize relative path")
.check("./test")
.for(join(__dirname, "../../scripts/test"));

normalizePathTest
.conduct("Project normalize absolute path")
.check("/test")
.for(join(__dirname, "../../scripts/test"));