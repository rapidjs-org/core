const config = {
	autoRestartTimeout: 2500
};


import cluster from "cluster";
import { Worker as Process } from "cluster";
import { cpus } from "os";
import { join, dirname } from "path";

import { IBroadcastMessage } from "./interfaces";
import { MODE } from "./MODE";
import { EVENT_EMITTER } from "./EVENT_EMITTER";
import { AsyncMutex } from "./AsyncMutex";
import { ErrorControl } from "./ErrorControl";
import { BroadcastListener } from "./BroadcastListener";
import * as print from "./print";


// TODO: IPC only plug-ins and ...?


const baseSize: number = MODE.DEV ? 1 : cpus().length;	// TODO: Use elaborate algorithm to determine root size
const errorControl = new ErrorControl(() => {
	print.error(new RangeError(`${MODE.DEV ? "Instance" : "Cluster"} has shut down due to heavy error density in processes`));
	
    setImmediate(() => process.exit(1));
});
const processMutex = new AsyncMutex();
const broadcastListener: BroadcastListener = new BroadcastListener();


cluster.settings.exec = join(__dirname, "./b:instance/instance");
cluster.settings.args = process.argv.slice(2);
cluster.settings.silent = true;


broadcastListener.on("terminate", () => setImmediate(() => process.exit(1)));


let listeningNotfications: number = baseSize;
const initialListeningEmission = () => {
	// TODO: Count inital instances to complete on base size reached
	if(listeningNotfications--) {
		return;
	}
	
	EVENT_EMITTER.emit("listening");

	cluster.removeListener("listening", initialListeningEmission);
};
cluster.on("listening", initialListeningEmission);

cluster.on("message", (message: IBroadcastMessage) => broadcastListener.emit(message));

cluster.on("listening", () => {
	setImmediate(() => print.info(`${MODE.DEV ? "Instance" : "Cluster"} process has started listening`));	// TODO: Eventual mark restarts
});
// TODO: Error recovery offset
cluster.on("error", err => {
	print.error(err);

	errorControl.feed();
});

cluster.on("exit", (code: number) => {
	if(code === 0 || MODE.DEV) {
		return;
	}

	create();
});


function create() {
	processMutex.lock(() => {
		const process = cluster.fork({
			dev: MODE.DEV,
			wd: dirname(require.main.filename)
		});

		// Pipe worker output to master (mem space A)
		process.process.stdout.on("data", (message: string) => {
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
	Array.from({ length: baseSize }, create);

    // Enforce singleton usage
    delete module.exports.initCluster;
}