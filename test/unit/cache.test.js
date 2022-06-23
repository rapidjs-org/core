
// TODO: Outsource and complete test framework

/* const cache = new (require("../../debug/core/a:cluster/b:worker/Cache").Cache)(500, key => {
    return key.toLowerCase();
});

const cacheReadTest = new UnitTest("Cache reading tests", cache.read);

const PIVOT_KEY = "Key";
const PIVOT_VALUE = "Value";

cacheReadTest
.conduct("Negatively check against cache entry existence")
.check(PIVOT_KEY).for(false);

cache.write(PIVOT_KEY, PIVOT_VALUE);

cacheReadTest
.conduct("Positively check against cache entry existence (exact key)")
.check(PIVOT_KEY.toLowerCase()).for(false);

cacheReadTest
.conduct("Positively check against cache entry existence (different, but normalization equivalent key)")
.check(PIVOT_KEY).for(false);

setTimeout(_ => {
    cacheReadTest
    .conduct("Negatively check against cache entry existence after according timeout")
    .check(PIVOT_KEY).for(false);
}, 505); */