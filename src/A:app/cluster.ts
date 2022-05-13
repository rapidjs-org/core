const config = {
	autoRestartTimeout: 2500
};


import cluster from "cluster";
import { cpus } from "os";
import { join, dirname } from "path";

import { print } from "../print";

import { PROJECT_CONFIG } from "./config/config.project";
import { MODE } from "./mode";
import { IS_SECURE } from "./secure";
import { IPCSignal } from "./IPCSignal";


print.info(`Running ${print.format(`${MODE.DEV ? "DEV" : "PROD"} MODE`, [MODE.DEV ? print.Format.FG_RED : 0, print.Format.T_BOLD])}`);

// TODO: Add cluster size field in config
// Do not create cluster if size is 1 (applies to DEV MODE, too)
const clusterSize: number = PROJECT_CONFIG.read("clusterSize").number || cpus().length;

// TODO: Prompt with warning if cluster size is configured huge

print.info(`HTTP${IS_SECURE ? "S" : ""} ${(clusterSize === 1) ? "server" : "cluster"} started listening (:${PROJECT_CONFIG.read("port", `http${IS_SECURE ? "s" : ""}`).number})`);
IS_SECURE && print.info(`HTTP (:${PROJECT_CONFIG.read("port", "http").string}) to HTTPS redirection enabled`);
// TODO: Print additional info if HTTP to HTTPS redirection is enabled

if(clusterSize == 1) {
	process.env.wd = dirname(require.main.filename);
    
	// Create a single socket / server if cluster size is 1
	require("./B:socket/socket");
} else {
	let initClusterProcesses = 0;

	// Create cluster (min. 2 sockets / servers)
	cluster.settings.exec = join(__dirname, "./B:socket/socket"); // SCRIPT
	cluster.settings.args = process.argv.slice(2); // ARGS
	cluster.settings.silent = true;
	
	// TODO: CPU strategy
	for(let i = 0; i < clusterSize; i++) {
		const workerProcess = cluster.fork({
			wd: dirname(require.main.filename)
		});

		// Pipe worker output to master (this context)
		workerProcess.process.stdout.on("data", printData => {
			console.log(String(printData));	// TODO: print.() ?
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
			print.error(`Error code: ${code}`);
            
			cluster.fork();
		});
	}, config.autoRestartTimeout);

	cluster.on("listening", () => {
		(++initClusterProcesses == clusterSize)
		&& print.info(`${clusterSize} cluster sockets have been set up`);
	});

	cluster.on("message", (_, message) => {
		print.info(message);
	});
}


export function ipcDown(signal: IPCSignal , data: TObject) {
	const message: TObject = {
		signal,
		data
	};
	
	if(clusterSize == 1) {
		require("./B:socket/thread-pool").ipcDown(message);
		
		return;
	}
    
	for(const worker of Object.values(cluster.workers)) {
		worker.send(message);
	}
}