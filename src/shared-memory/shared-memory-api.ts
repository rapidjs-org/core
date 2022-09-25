import * as sharedMemory from "./shared-memory";


const sharedMemoryActive = {
    write: true,
    read: true
};
const appKey: number = generateAppKey();


registerFree("uncaughtException", 1);
registerFree("unhandledRejection", 1);
registerFree("SIGTERM");
registerFree("SIGINT");
registerFree("SIGQUIT");
registerFree("exit");


sharedMemory.init(appKey);


function generateAppKey(): number { // uint32_t (MAX: 4294967295 ≈ ⌊MAX = 4000000000 => #Keys := 4 * 10^9)
    return 1234567890;  // TODO: Implement
}

function registerFree(event: string, exitCode: number = 0) {
    process.on(event, () => {
        sharedMemory.free();
        
        return exitCode;
    });
}


export function getAppKey(): number {
    return appKey;
}

export async function write(purposeKey: string, purposeData: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if(!sharedMemoryActive.write) {
            reject(new EvalError("Shared memory access has been disabled due to preceding error"));

            return;
        }

        try {
            sharedMemory.write(purposeKey, Buffer.from(purposeData, "utf-8"));
            
            resolve();
        } catch(err) {
            reject(err);

            sharedMemoryActive.write = false; // TODO: Distinguish errors?
        }
    });
}

export function read(purposeKey: string): string {
    if(!sharedMemoryActive.read) {
        throw new EvalError("Shared memory access has been disabled due to preceding error");   // TODO: null ?
    }
    
    try {
        const buffer: Buffer = sharedMemory.read(purposeKey);
        const str: string = String(buffer);

        return str || null;
    } catch(err) {
        sharedMemoryActive.read = false; // TODO: Distinguish errors?

        throw err;
    }
}

// TODO: (mid-term) local fallback if shared memory not accessible?