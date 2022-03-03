
import { join } from "path";


export class Cluster {
    private readonly cluster;

    constructor(module: string, cores: number, args: string[] = [], cwd: string = process.cwd()) {
        this.cluster = require("cluster");

        this.cluster.settings.exec = join(__dirname, module); // SCRIPT
        this.cluster.settings.cwd = cwd;
        this.cluster.settings.args = args; // ARGS


        // TODO: CPU strategy
        for(let i = 0; i < cores; i++) {
            this.cluster.fork();
        }

        this.cluster.on("exit", (worker, code) => {
            if (code === 0 || worker.exitedAfterDisconnect) {
                return;
            }

            // TODO: Stop on recursive error eventually
            // Error restart / fill up
            this.cluster.fork();
        });
    }

    public on(event: string, callback: (...args) => void) {
        this.cluster.on(event, callback);
    }
}