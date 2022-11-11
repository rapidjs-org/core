const { Cache } = require("../../debug/b:instance/c:thread/memory/Cache");

const testCache = new Cache(500);


assert("Check for non-existence of cache entry", testCache.exists("foo"), false);

assert("Read non-existing cache entry", testCache.read("foo"), null);

testCache.write("foo", "bar");

assert("Check for existence of cache entry", testCache.exists("foo"), true);

assert("Read existing entry from cache", testCache.read("foo"), "bar");

assert("Check for existence of limit exceeding existing cache entry", new Promise(resolve => {
    setTimeout(_ => resolve(testCache.exists("foo")), 550);
}), false);