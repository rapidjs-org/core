import * as sharedMemory from "./shared-memory";
import { PATH } from "../PATH";


const sharedMemoryActive = {
    write: true,
    read: true
};
const appKey: number = generateAppKey();


sharedMemory.init(appKey);


function generateAppKey(): number { // uint32_t (MAX: 4294967296)
    return parseInt(`rapidJS:${PATH}`
    .split("")
    .map((char: string) => char.charCodeAt(0).toString(16))
    .join("")) % 4294967296;
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

export function registerFree(event: string|string[], exitCode = 0) {
    [ event ].flat()
    .forEach((event: string) => {
        process.on(event, () => {
            sharedMemory.free();
            
            process.exit(exitCode);
        });
    });
}