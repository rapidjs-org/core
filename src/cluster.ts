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
		if(hasBeenDestroyed) {
			return;
		}

		Object.keys(cluster.workers)
		.forEach((id: string) => {
			const process: Process = cluster.workers[id];
			process.send(message);
		});
	});
});
const broadcastAbsorber: BroadcastAbsorber = new BroadcastAbsorber();

let hasBeenDestroyed: boolean = false;


cluster.settings.exec = join(__dirname, "./b:instance/instance");
cluster.settings.args = process.argv.slice(2);
cluster.settings.silent = true;


broadcastAbsorber.on("reg:request", (sReqSerialized: string) => EVENT_EMITTER.emit("request", sReqSerialized));
broadcastAbsorber.on("reg:response", (sResSerialized: string) => EVENT_EMITTER.emit("response", sResSerialized));
broadcastAbsorber.on("terminate", () => process.exit(1));	// TODO: Race conditions with print?


const exitHandler = (code: number) => {
	if(code === 0 || MODE.DEV) {
		return;
	}

	create(`${MODE.DEV ? "Instance" : "Cluster"} process has restarted after internal error`);
};

const initialErrorHandler: ((err: Error) => void) = err => {
	print.error(err);
	
	process.exit(1);
};
cluster.on("error", initialErrorHandler);

// TODO: SHM custom-cluster with IP-hash distributed worker load
let listeningNotfications: number = baseSize;
const initialListenerHandler: (() => void) = () => {
	if(--listeningNotfications) {
		return;
	}

    print.info(`${MODE.DEV ? "Instance" : "Cluster"} listening on port ${APP_CONFIG.port}`);
	
	setImmediate(() => EVENT_EMITTER.emit("listening"));

	cluster.removeListener("listening", initialListenerHandler);
	cluster.removeListener("error", initialErrorHandler)

	cluster.on("error", err => {
		print.error(err);
		
		errorControl.feed();
	});
	
	cluster.on("exit", exitHandler);
};
cluster.on("listening", initialListenerHandler);

cluster.on("message", (_, message: IBroadcastMessage) => broadcastAbsorber.absorb([ message ]));


function create(listeningMessage?: string) {
	processMutex.lock(new Promise((resolve, reject) => {
		const subProcess = cluster.fork({
			dev: MODE.DEV,
			wd: dirname(require.main.filename)
		});

		// Pipe worker output to master (mem space A)
		subProcess.process.stdout.on("data", (message: string) => {
			print.info(String(message).replace(/\n$/, ""));
		});
		subProcess.process.stderr.on("data", (err: string) => {
			print.error(err);
		});

        const initialErrorHandler: ((err: Error) => void) = err => {
			print.error(err);
			
			setImmediate(() => process.exit(1));
        };
        subProcess.on("error", initialErrorHandler);

		subProcess.on("listening", () => {			
			listeningMessage && print.info(listeningMessage);

			subProcess.send(broadcastEmitter.recoverHistory());
			
            subProcess.removeListener("error", initialErrorHandler);

			resolve(null);
		});
	}));
}


export function init() {
	Array.from({ length: baseSize }, create);

    // Enforce singleton usage
    delete module.exports.init;
}

export function destroy() {
	hasBeenDestroyed = true;
	
	cluster.removeListener("exit", exitHandler);

	Object.keys(cluster.workers)
	.forEach((id: string) => {
		const process: Process = cluster.workers[id];
		process.kill("SIGKILL");
	});
	
	cluster.disconnect();
	
    print.info(`${MODE.DEV ? "Instance" : "Cluster"} has \x1b[38;2;224;0;0mshut down\x1b[0m`);

    // Enforce singleton usage
    delete module.exports.destroy;
}

export function broadcast(signal: string, data?: string) {
	const message: IBroadcastMessage = {
		signal, data
	};

	broadcastEmitter.emit(message);
}