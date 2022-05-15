const config = {
	autoRestartTimeout: 2500
};


import cluster from "cluster";
import { Worker } from "cluster";
import { cpus } from "os";
import { join, dirname } from "path";

import { print } from "../print";

import { PROJECT_CONFIG } from "./config/config.project";
import { MODE } from "./mode";
import { IS_SECURE } from "./secure";
import { ErrorControl } from "./ErrorControl";
import { IPCSignal } from "./IPCSignal";
import { IIPCPackage } from "./interfaces.A";


print.info(`Running ${print.format(`${MODE.DEV ? "DEV" : "PROD"} MODE`, [MODE.DEV ? print.Format.FG_RED : 0, print.Format.T_BOLD])}`);

// TODO: Add cluster size field in config
// Do not create cluster if size is 1 (applies to DEV MODE, too)
const clusterSize: number = PROJECT_CONFIG.read("clusterSize").number || cpus().length;
const onlineWorkers: Set<Worker> = new Set();
const ipcHistory: IIPCPackage[] = [];
const clusterErrorControl = new ErrorControl("Density of errors caused in server cluster sub-process(es) too high");

// TODO: Prompt with warning if cluster size is configured huge

print.info(`HTTP${IS_SECURE ? "S" : ""} ${(clusterSize === 1) ? "server" : "cluster"} started listening (:${PROJECT_CONFIG.read("port", `http${IS_SECURE ? "s" : ""}`).number})`);
IS_SECURE && print.info(`HTTP (:${PROJECT_CONFIG.read("port", "http").string}) to HTTPS redirection enabled`);
// TODO: Print additional info if HTTP to HTTPS redirection is enabled

if(clusterSize == 1) {
	process.env.wd = dirname(require.main.filename);
    
	// Create a single socket / server if cluster size is 1
	require("./B:socket/socket");
} else {
	// Create cluster (min. 2 sockets / servers)
	cluster.settings.exec = join(__dirname, "./B:socket/socket"); // SCRIPT
	cluster.settings.args = process.argv.slice(2); // ARGS
	cluster.settings.silent = true;

	let listeningWorkers: number = 0;
	
	// TODO: CPU strategy
	Array.from({ length: clusterSize }, createWorker);

	// Automatic restart on error
	// Starts after specified timeout in order to prevent endless restarts on start up errors
	setTimeout(() => {
		cluster.on("exit", (workerProcess: Worker, code: number) => {
			if (code === 0 || workerProcess.exitedAfterDisconnect) {
				return;
			}
			
			onlineWorkers.delete(workerProcess);	// TODO: Work with ID only?
			// TODO: Stop on recursive error eventually

			// Error restart / fill up
			print.info("Socket process restarted due to an error");
			print.error(`Error code: ${code}`);
            
			cluster.fork();

			clusterErrorControl.feed();
		});
	}, config.autoRestartTimeout);

	cluster.on("listening", () => {
		(++listeningWorkers === clusterSize)
		&& print.info(`${clusterSize} cluster sockets have been set up`);
	});

	cluster.on("message", (_, message) => {
		print.info(message);
	});
}


function createWorker() {
	const workerProcess = cluster.fork({
		wd: dirname(require.main.filename)
	});

	workerProcess.send(ipcHistory);

	// Pipe worker output to master (this context)
	workerProcess.process.stdout.on("data", printData => {
		console.log(String(printData));	// TODO: print.() ?
	});
	workerProcess.process.stderr.on("data", printData => {
		console.error(String(printData));
	});
}


// TODO: Passive plug-in registry
// TODO: General async creation signal restoration mechanism
export function ipcDown(signal: IPCSignal , data) {
	const message: IIPCPackage = {
		signal,
		data
	};

	if(clusterSize == 1) {
		require("./B:socket/thread-pool").ipcDown([message]);
		
		return;
	}
	
	for(const workerProcess of Object.entries(cluster.workers)) {
		workerProcess[1].send([message]);
	}

	ipcHistory.push(message);
}