
// Parameter
const config = {
    periodLength: 60000
};


import { PROJECT_CONFIG } from "../config/config.project";


// Object
const limiter: {
    windowStart: number,

    prevPeriod?: Map<string, number>
    curPeriod?: Map<string, number>
} = {
    windowStart: 0
};

const requestLimit = PROJECT_CONFIG.read("limit", "requestsPerMin").number || 0;


/**
 * Update limiter window.
 * @returns {number} Current window weight
 */
function updateWindow() {
    // TODO: Weak cluster size related amount weight?
    const now = Date.now();
    
    let timeIn = Math.abs(limiter.windowStart - now);
    
    if(timeIn >= config.periodLength) {
        limiter.prevPeriod = ((timeIn >= (2 * config.periodLength)) ? null : limiter.curPeriod) || new Map();
        limiter.curPeriod = new Map();

        timeIn = timeIn % config.periodLength;
        limiter.windowStart = now - timeIn;
    }

    return (timeIn / config.periodLength);
}


/**
 * Check whether to block the request by the rate limiter.
 * @param {string} ip - IP address of request's remote connection
 * @return {boolean} - Whether the request must be blocked due to 429 (Too many requests)
 */
export function rateExceeded(ip: string) {
    if(requestLimit === 0) {
        return false;
    }

    const curWindowWeight = updateWindow();
    const slideSum = Math.floor((curWindowWeight * (limiter.curPeriod.get(ip) || 0))
                    + ((1 - curWindowWeight) * (limiter.prevPeriod.get(ip) || 0)));
    if(slideSum >= requestLimit) {
        // Deny request
        return true;
    }

    limiter.curPeriod.set(ip, (limiter.curPeriod.get(ip) || 0) + 1);
    
    // Allow request
    return false;
}