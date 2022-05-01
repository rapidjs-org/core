
const util = require("../../debug/util");


const mergeTest = new Test(util.mergeObj, "Object merge tests");

mergeTest
.conduct("Merge disjunctive objects")
.check({
    a: 1
}, {
    b: 2
}).for({
    a: 1,
    b: 2
});

mergeTest
.conduct("Merge two intersecting objects")
.check({
    a: 1,
    b: 1
}, {
    b: 2,
    c: 2
}).for({
    a: 1,
    b: 2,
    c: 2
});