
// process.argv[2] = "--dev";
process.argv[3] = "--path"; process.argv[4] = "../test/debug:app";

require("../debug:app/server");