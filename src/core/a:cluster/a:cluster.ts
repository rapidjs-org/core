/**
 * Module containing a singleton server cluster management interface.
 * Once initialized a fixed size worker pool is maintained through
 * erroroneous worker replacement and burst error control mechanisms.
 */


const config = {
	autoRestartTimeout: 2500
};

import cluster from "cluster";
import { Worker } from "cluster";
import { cpus } from "os";
import { join, dirname } from "path";

import { print } from "../print";

import { Config } from "../config/Config";
import { AsyncMutex } from "./AsyncMutex";
import { ErrorControl } from "./ErrorControl";
import { BroadcastMessage, TBroadcastSignal } from "./BroadcastMessage";
import { IS_SECURE } from "./IS_SECURE";


// TODO: IPC only plug-ins and ...?


const clusterSize: number = Config["project"].read("clusterSize").number || cpus().length;	// TODO: DEV MODE: 1 or from dev config
const workerMutex = new AsyncMutex();
const errorControl = new ErrorControl("Density of errors caused in server cluster too high");


/**
 * Global cluster settings to be applied to each new worker instance.
 */
cluster.settings.exec = join(__dirname, "./b:worker/b:worker");	// Execute worker module in fork
cluster.settings.args = process.argv.slice(2);	// Pass through CLI arguments
cluster.settings.silent = true;	// Bubble up worker output to use std channels of cluster parent
// TODO: Prompt with warning if cluster size is configured too large?


/**
 * Create a single cluster worker process.
 */
function createWorker() {
	workerMutex.lock(() => {
		const worker = cluster.fork({
			wd: dirname(require.main.filename)
		});

		worker.on("listening", () => {
			// Print cluster start up messag (utilizing incremental worker id)
			if(worker.id !== clusterSize) {
				return;
			}

			print.info(`HTTP${IS_SECURE ? "s" : ""} server cluster started listening on port ${Config["project"].read("port", `http${IS_SECURE ? "s" : ""}`).number}`);
			IS_SECURE
			&& print.info(`HTTP to HTTPS redirection enabled (:${Config["project"].read("port", "http").number} -> :${Config["project"].read("port", "https").number})`);

			worker.removeAllListeners("listening");
		});

		// Provide new worker with IPC history to replicate state
		worker.send(BroadcastMessage.history);

		/* worker.on("message", message => {
			if(message === 1) {
				cluster.removeAllListeners("exit");

				// Worker requested termination
				for(const workerProcess of Object.entries(cluster.workers)) {
					workerProcess[1].kill();
				}

				process.exit(1);
			}
		}); */

		// Pipe worker output to master (this context)
		worker.process.stdout.on("data", (printData: string) => {
			process.stdout.write(printData);
		});
		worker.process.stderr.on("data", (printData: string) => {
			process.stderr.write(printData);
		});
	});
}


/**
 * Initialize server cluster.
 * Self-deleting interface after one time usage in order to keep
 * fixed size cluster size.
 */
export function initCluster() {
	// Create fixed size worker pool to maintain
	Array.from({ length: clusterSize }, createWorker);

	// Automatic restart on error
	// Starts after specified timeout in order to prevent endless restarts on start up errors
	setTimeout(() => {
		cluster.on("exit", (workerProcess: Worker, code: number) => {
			if (code === 0 || workerProcess.exitedAfterDisconnect) {
				return;
			}
			
			// Worker error "restart" / pool spot replacement
			print.info("Socket process restarted due to an error");
			
			cluster.fork();

			errorControl.feed();
		});
	}, config.autoRestartTimeout);	// Prevent initial replacement strtategyrecursion security
    
    // Enforce singleton cluster paradigm (fixed size usage)
    delete module.exports.initCluster;
}

/**
 * Broadcast workers with uniform broadcast message.
 * Keep message history to provide to new workers in order to allow for individual
 * state replication.
 * @param {TBroadcastSignal} signal Broadcast signal
 * @param {*} data Broadcast data
 */
export function workerBroadcast(signal: TBroadcastSignal, data: unknown) {
	workerMutex.lock(() => {
		const broadcastMessage: BroadcastMessage = new BroadcastMessage(signal, data);

		for(const workerProcess of Object.entries(cluster.workers)) {
			workerProcess[1].send(broadcastMessage);
		}

		BroadcastMessage.pushHistory(broadcastMessage);
	});
}