import cluster from "cluster";
import { Worker as Process } from "cluster";
import { cpus } from "os";
import { join, dirname } from "path";

import { IBroadcastMessage } from "./interfaces";
import { MODE } from "./MODE";
import { APP_CONFIG } from "./config/APP_CONFIG";
import { EVENT_EMITTER } from "./EVENT_EMITTER";
import { AsyncMutex } from "./AsyncMutex";
import { ErrorMonitor } from "./ErrorMonitor";
import { BroadcastAbsorber, BroadcastEmitter } from "./Broadcast";
import * as print from "./print";


// TODO: IPC only plug-ins and ...?


const baseSize: number = MODE.DEV ? 1 : cpus().length;	// TODO: Use elaborate algorithm to determine root size
const errorControl = new ErrorMonitor(() => {
	print.error(new RangeError(`${MODE.DEV ? "Instance" : "Cluster"} has shut down due to heavy error density in processes`));
	
    setImmediate(() => process.exit(1));
});
const processMutex = new AsyncMutex();
const broadcastEmitter: BroadcastEmitter = new BroadcastEmitter((message: IBroadcastMessage|IBroadcastMessage[]) => {
	processMutex.lock(() => {
		Object.keys(cluster.workers)
		.forEach((id: string) => {
			const process: Process = cluster.workers[id];
			process.send(message);
		});
	});
});
const broadcastAbsorber: BroadcastAbsorber = new BroadcastAbsorber();


cluster.settings.exec = join(__dirname, "./b:instance/instance");
cluster.settings.args = process.argv.slice(2);
cluster.settings.silent = true;


broadcastAbsorber.on("reg:request", (sReqSerialized: string) => EVENT_EMITTER.emit("request", sReqSerialized));
broadcastAbsorber.on("reg:response", (sResSerialized: string) => EVENT_EMITTER.emit("response", sResSerialized));
broadcastAbsorber.on("terminate", () => setImmediate(() => process.exit(1)));


// TODO: SHM custom-cluster with IP-hash distributed worker load
let listeningNotfications: number = baseSize;
const initialListeningEmission = () => {
	if(--listeningNotfications) {
		return;
	}

    print.info(`Server listening on port ${APP_CONFIG.port}`);
	
	EVENT_EMITTER.emit("listening");

	cluster.removeListener("listening", initialListeningEmission);
};
cluster.on("listening", initialListeningEmission);

cluster.on("message", (_, message: IBroadcastMessage) => broadcastAbsorber.absorb(message));

// TODO: Error recovery offset
cluster.on("error", err => {
	print.error(err);

	errorControl.feed();
});

cluster.on("exit", (code: number) => {
	if(code === 0 || MODE.DEV) {
		return;
	}

	create(`${MODE.DEV ? "Instance" : "Cluster"} process has restarted after internal error`);
});


function create(listeningMessage?: string) {
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

		cluster.on("listening", () => {
			listeningMessage && print.info(listeningMessage);

			process.send(broadcastEmitter.recoverHistory());
		});
	});
}


export function init() {
	Array.from({ length: baseSize }, create);

    // Enforce singleton usage
    delete module.exports.initCluster;
}

export function broadcast(signal: string, data?: string) {
	const message: IBroadcastMessage = {
		signal, data
	};

	broadcastEmitter.emit(message);
}