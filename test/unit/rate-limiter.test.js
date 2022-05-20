

const rateLimiter = new (require("../../debug/A:app/B:worker/RateLimiter").RateLimiter)(2, 1000);

const rateLimiterTest = new UnitTest("Rate limiter tests", rateLimiter.exceeded);


const IP_AUGMENT = "ip";


// TODO: Re-implement once framework supports object property passing
/* rateLimiterTest
.conduct("Negatively check against rate limiter")
.check(IP_AUGMENT).for(false);

rateLimiterTest
.conduct("Negatively check against rate limiter again")
.check(IP_AUGMENT).for(false);

rateLimiterTest
.conduct("Positively check against rate limiter")
.check(IP_AUGMENT).for(true);

setTimeout(_ => {
    rateLimiterTest
    .conduct("Negatively check against rate limiter after according timeout")
    .check(IP_AUGMENT).for(false);

    rateLimiterTest
    .conduct("Positively check against rate limiter after according timeout")
    .check(IP_AUGMENT).for(true);
}, 500); */