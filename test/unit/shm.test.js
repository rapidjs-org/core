const { getAppKey } = require("../../debug/shared-memory/shared-memory-api");


assert("Get unique shared memory app key", getAppKey(), 3897592908);