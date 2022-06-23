const { mergeObj } = require("../../debug/core/util");

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


const { arrayify } = require("../../debug/core/util");

const arrayifyTest = new UnitTest("Arrayify value tests", arrayify);

arrayifyTest
.conduct("Arrayify array")
.check([1, 2])
.for([1, 2]);

arrayifyTest
.conduct("Arrayify atomic number")
.check(1)
.for([1]);