
process.argv[2] = "--dev";
process.argv[3] = "--wd"; process.argv[4] = "../test/network/debug:app";

require("./debug:app/server");