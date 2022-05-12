
const cache = new (require("../../debug/A:app/Cache").Cache)(500, key => {
    return key.toLowerCase();
});

const cacheReadTest = new UnitTest("rate-limiter tests", cache.read);

const PIVOT_KEY = "Key";
const PIVOT_VALUE = "Value";

/* cacheReadTest
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