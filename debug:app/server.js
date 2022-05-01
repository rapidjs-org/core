// Instanciate core environment
const rapidJS = require("../debug/A:app/app");


rapidJS.plugin("./test-plugin/app", {
	integrateManually: true,
	alias: "test-plugin"
});