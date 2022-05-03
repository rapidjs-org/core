// Instanciate core environment
const rapidJS = require("../../debug/A:app/app");


rapidJS.plugin("./test-plugin/app", {
	alias: "test-plugin"
});

rapidJS.plugin("./test-plugin/app", {
	integrateManually: true,
	alias: "test-plugin-2"
});