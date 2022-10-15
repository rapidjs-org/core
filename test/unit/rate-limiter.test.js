const { RateLimiter } = require("../../debug/b:instance/RateLimiter");

const testRateLimiter = new RateLimiter(1, 500);


assert("Check if rate limiter grants access", testRateLimiter.grantsAccess("foo"), true);
assert("Check if rate limiter restricts access", testRateLimiter.grantsAccess("foo"), false);

assert("Check if rate limiter grants access after sufficient delay (total)", new Promise(resolve => {
    setTimeout(_ => resolve(testRateLimiter.grantsAccess("foo")), 550);
}), true);

assert("Check if rate limiter grants access after sufficient delay (weighted)", new Promise(resolve => {
    setTimeout(_ => resolve(testRateLimiter.grantsAccess("foo")), 300);
}), true);