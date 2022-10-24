const config = {
	autoRestartTimeout: 2500
};


import cluster from "cluster";
import { Worker as Process } from "cluster";
import { cpus } from "os";
import { join, dirname } from "path";

import { IBroadcastMessage } from "./interfaces";
import { MODE } from "./MODE";
import { AsyncMutex } from "./AsyncMutex";
import { ErrorControl } from "./ErrorControl";
import { BroadcastListener } from "./BroadcastListener";
import * as print from "./print";


// TODO: IPC only plug-ins and ...?


const baseSize: number = MODE.DEV ? 1 : cpus().length;	// TODO: Use elaborate algorithm to determine root size
const poolCaption: string = (baseSize > 1) ? "Cluster" : "Instance";
const processMutex = new AsyncMutex();
const errorControl = new ErrorControl(() => {
	print.error(new RangeError(`${poolCaption} shut down due to heavy error density`));
	
    process.exit(1);
});
const broadcastListener: BroadcastListener = new BroadcastListener();


cluster.settings.exec = join(__dirname, "./b:instance/instance");
cluster.settings.args = process.argv.slice(2);
cluster.settings.silent = true;


broadcastListener.on("feed-error-cotrol", () => errorControl.feed());


// TODO: Check sizes after errors

function create() {
	processMutex.lock(() => {
		const process = cluster.fork({
			wd: dirname(require.main.filename)
		});

		process.on("listening", () => {
			print.info(`${poolCaption} process has started listening`);
		});

		process.on("message", (message: IBroadcastMessage) => broadcastListener.emit(message));

		process.on("error", err => {
			print.error(err);
        	
			create();
		});

		process.on("exit", (code: number) => {
			if(code === 0) {
				return;
			}

        	print.error(`Process has terminated for an unknown reason with exit code ${code}`);
        	
			create();
		});

		// Pipe worker output to master (mem space A)
		process.process.stdout.on("data", (message: string) => {
			// TODO: Ignore equivalemnt messages from different sub-processes
			print.info(String(message).replace(/\n$/, ""));
		});
		process.process.stderr.on("data", (err: string) => {
			print.error(err);
		});
	});
}

function broadcastDown(message: IBroadcastMessage) {
	processMutex.lock(() => {
		for(const process of Object.entries(cluster.workers)) {
			process[1].send(message);
		}
	});
}


export function init() {
    setTimeout(() => {
		cluster.on("exit", (process: Process, code: number) => {
			if(code === 0 || process.exitedAfterDisconnect) {
				return;
			}
			
			create();
            
			errorControl.feed();
		});
	}, config.autoRestartTimeout);
    
	Array.from({ length: baseSize }, create);

    // Enforce singleton usage
    delete module.exports.initCluster;
}