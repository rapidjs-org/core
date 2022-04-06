/**
 * >> START OF MAIN MEMORY (A LEVEL) <<
 */

const config = {
    autoRestartTimeout: 2500
};


import cluster from "cluster";
import { cpus } from "os";
import { join, dirname } from "path";

import { print } from "../print";

import { MODE } from "./mode";
import { PROJECT_CONFIG } from "./config/config.project";


print.info(`Running ${print.format(`${MODE.DEV ? "DEV" : "PROD"} MODE`, [MODE.DEV ? print.Format.RED : 0, print.Format.BOLD])}`);


// TODO: Add cluster size field in config
// Do not create cluster if size is 1 (applies to DEV MODE, too)
const clusterSize: number = PROJECT_CONFIG.read("clusterSize").number || cpus().length;

print.info(`${(clusterSize === 1) ? "Server" : "Cluster"} listening on port ${PROJECT_CONFIG.read("port", "http").number}`);

if(clusterSize == 1) {
    // Create a single socket / server if cluster size is 1
    require("./B:socket/socket");
} else {
    // Create cluster (min. 2 sockets / servers)
    cluster.settings.exec = join(__dirname, "./B:socket/socket"); // SCRIPT
    cluster.settings.args = process.argv.slice(2); // ARGS
    cluster.settings.silent = true;

    // TODO: CPU strategy
    for(let i = 0; i < clusterSize; i++) {
        const workerProcess = cluster.fork({
            wd: dirname(process.argv[1])
        });

        // Pipe worker output to master (this context)
        workerProcess.process.stdout.on("data", printData => {
            console.log(String(printData));
        });
        workerProcess.process.stderr.on("data", printData => {
            console.error(String(printData));
        });
    }

    // Automatic restart on error
    // Starts after specified timeout in order to prevent endless restarts on start up errors
    setTimeout(() => {
        cluster.on("exit", (workerProcess, code) => {
            if (code === 0 || workerProcess.exitedAfterDisconnect) {
                return;
            }

            // TODO: Stop on recursive error eventually
            // Error restart / fill up
            print.info("Socket process restarted due to an error");

            cluster.fork();
        });
    }, config.autoRestartTimeout);

    cluster.on("listening", thread => {
        print.info(`Thread ${thread.id} has set up server`);
    });

    cluster.on("message", (_, message) => {
        print.info(message);
    });
}