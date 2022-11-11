const { MODE } = require("../../debug/MODE");

assert("Check if runtime mode has correctly been inferred (assuming PROD)", MODE.PROD, true);