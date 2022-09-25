const { getAppKey } = require("../../debug/shared-memory/shared-memory-api");


assert("Get unique SHM app key", getAppKey(), 1234567890);