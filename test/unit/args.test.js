process.argv.push("-T", "test-value-ignore");
process.argv.push("--test-arg-existing", "test-value");


const { parseFlag, parseOption } = require("../../debug/args");


assert("Check for non-existence of argument flag", parseFlag("test-arg-non-existing"), false);

assert("Check for existence of argument flag (full name)", parseFlag("test-arg-existing"), true);

assert("Check for existence of argument flag (shorthand name)", parseFlag("test-arg-existing", "T"), true);

assert("Check for non-existence of argument option", parseOption("test-arg-non-existing").string, undefined);

assert("Check for existence of argument option (full name)", parseOption("test-arg-existing").string, "test-value");

assert("Check for existence of argument option (shorthand name)", parseOption("test-arg-existing", "T").string, "test-value");