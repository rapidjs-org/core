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
    // HASH: Use master process identity property (disc location?)
}

function registerFree(event: string, exitCode = 0) {
    process.on(event, () => {
        sharedMemory.free();
        
        return exitCode;
    });
}


export function getAppKey(): number {
    return appKey;
}

export async function write(purposeKey: string, purposeData: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            writeSync(purposeKey, purposeData);
            
            resolve();
        } catch(err) {
            reject(err);
        }
    });
}

export async function writeSync(purposeKey: string, purposeData: unknown) {
    if(!sharedMemoryActive.write) {
        throw new RangeError("Shared memory not available");
    }
    
    try {
        sharedMemory.write(purposeKey, Buffer.from(
            (!(typeof(purposeData) === "string")
            ? JSON.stringify(purposeData)
            : purposeData), "utf-8"));
    } catch(err) {            
        sharedMemoryActive.write = false; // TODO: Distinguish errors?

        throw err;
    }
}

export function read<T>(purposeKey: string): Promise<T> {
    return new Promise((resolve, reject) => {
        try {
            const data: T = readSync<T>(purposeKey);

            resolve(data);
        } catch(err) {
            reject(err);
        }
    });
}

export function readSync<T>(purposeKey: string): T {
    if(!sharedMemoryActive.read) {
        throw new RangeError("Shared memory not available");
    }
    
    try {
        const buffer: Buffer = sharedMemory.read(purposeKey);
        const serial = String(buffer);

        let data: T;
        try {
            data = JSON.parse(serial);
        } catch {
            data = serial as unknown as T;
        }

        return (data || null) as T;
    } catch(err) {
        sharedMemoryActive.read = false;

        throw err;
    }
}