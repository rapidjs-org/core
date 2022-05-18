
const rateLimiterTest = new UnitTest("Rate limiter tests", require("../../debug/A:app/B:socket/rate-limiter").rateExceeded);

const IP_AUGMENT = "ip";

rateLimiterTest
.conduct("Negatively check against rate limit")
.check(IP_AUGMENT).for(false);

rateLimiterTest
.conduct("Positively check against rate limit")
.check(IP_AUGMENT).for(true);

setTimeout(_ => {
    rateLimiterTest
    .conduct("Negatively check against rate limit after according timeout")
    .check(IP_AUGMENT).for(false);
}, 3000);