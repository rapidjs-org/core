// TODO: To GitHub as remote dependency?

log("• TEST SUITE");


require("./test-unit.js");
require("./test-network.js");


function log(message) {
    console.log(`\x1b[2m${message}\n${Array.from({ length: message.length }, _ => "‾").join("")}\x1b[0m`);
}