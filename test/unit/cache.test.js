const { Cache } = require("../../debug/cache/Cache");

const pivot = new Cache(500);


assert("Check for existence of non-existing cache entry", pivot.exists("foo"), false);

assert("Read non-existing cache entry", pivot.read("foo"), null);

pivot.write("foo", "bar");

assert("Check for existence of existing cache entry", pivot.exists("foo"), true);

assert("Read existing entry from cache", pivot.read("foo"), "bar");

assert("Check for existence of limit exceeding existing cache entry", new Promise(resolve => {
    setTimeout(_ => resolve(pivot.exists("foo")), 550);
}), false);