const { join } = require("path");


// MEM 0

const { mergeObj } = require("../../debug/util");

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

// MEM C

const { computeETag } = require("../../debug/A:app/B:socket/C:thread/util");

const computeETagTest = new UnitTest("Compute ETag tests", computeETag);

computeETagTest
.conduct("Compute ETag")
.check("<html></html>")
.for("c83301425b2ad1d496473a5ff3d9ecca");