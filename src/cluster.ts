import { AsyncMutex } from "./AsyncMutex";

import cluster from "cluster";
import { Worker } from "cluster";

const clusterMutex: AsyncMutex = new AsyncMutex();


// TODO: Implement