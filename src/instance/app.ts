// TODO: Server instance (with CPU local worker threads)


import { join, dirname } from "path";

import { print } from "../print";
import { createCluster  } from "../cluster";

import { MODE } from "./mode";
import { PROJECT_CONFIG } from "./config/config.project";


const cluster = createCluster(join(__dirname, "./server/socket"), MODE.DEV ? 1 : null, {
    wd: dirname(process.argv[1])
});

print.log(`Cluster listening on port ${PROJECT_CONFIG.read("port", "http").number}`);

cluster.on("listening", thread => {
    print.log(`Thread ${thread.id} has set up server.`);
});

cluster.on("message", (_, message) => {
    print.log(message);
});