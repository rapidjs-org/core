
const config = {
    autoRestartTimeout: 2500
};


import { cpus } from "os";

import cluster from "cluster";

import { print } from "./print";


export function createCluster(modulePath: string, amount?: number, env: Record<string, string|number|boolean> = {}) {
    cluster.settings.exec = modulePath; // SCRIPT
    cluster.settings.args = process.argv.slice(2); // ARGS
    cluster.settings.silent = true;

    // TODO: CPU strategy
    for(let i = 0; i < (amount || cpus().length); i++) {
        const workerProcess = cluster.fork(env);

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
            print.log("Error in worker process ... restart");

            cluster.fork();
        });
    }, config.autoRestartTimeout);

    return cluster;
}