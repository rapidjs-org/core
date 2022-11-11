const { join } = require("path");


const { PATH } = require("../../debug/PATH");

assert("Check if project path has correctly been constructed", PATH, join(__dirname, "../.tmp"));