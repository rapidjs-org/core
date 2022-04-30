// Instanciate core environment
const rapidJS = require("../debug/A:app/app");


setTimeout(_ => {

	rapidJS.plugin("./test-plugin/app", {
	specific: true,
	alias: "test-plugin"
});

}, 1000);