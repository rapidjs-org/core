#! /usr/bin/env node

import { lstatSync } from "fs";
import { cpus } from "os";

import { argument } from "../args";

import { Cluster } from "./cluster";


const cwd: string|boolean = argument("path", "P") || process.cwd();

if(cwd === true) {
    throw new TypeError(`Given working directory argument without a path`);
}
if(!lstatSync(cwd).isDirectory()) {
    throw new ReferenceError(`Given working directory No directory given`);
}


// TODO: No proxy mode


const instanceCluster = new Cluster("../instance/app", cpus().length, [], cwd);


instanceCluster.on("online", worker => {
    console.log("Worker", worker.id, " has started.")
});

instanceCluster.on("listening", worker => {
    console.log("Worker", worker.id, " has set up server.")
});

instanceCluster.on("exit", (worker, _, signal) => {
    console.log("Worker", worker.id, "has exited with signal", signal);
});