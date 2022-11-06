const { getAppKey } = require("../../debug/b:instance/shared-memory/shared-memory-api");


assert("Get unique shared memory app key", getAppKey(), 1234567890);