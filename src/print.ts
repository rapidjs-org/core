const devConfig = {
    "appNameShort": "rJS"
};


import cluster from "cluster";
import { isMainThread } from "worker_threads";

import { EVENT_EMITTER } from "./EVENT_EMITTER";
import { MODE } from "./MODE";
import { AsyncMutex } from "./AsyncMutex";


type TColor = [ number, number, number, EColorMode? ];

enum EStdChannel {
    OUT = "stdout",
    ERR = "stderr"
}

enum EColorMode {
    FG = "38",
    BG = "48"
}


const writeMutex: AsyncMutex = new AsyncMutex();
const isRootContext: boolean = cluster.isPrimary && isMainThread;

let lastMessage: {
    count: number;
    isMultiline: boolean;
    message: string;
};


process.stdin.on("data", (char: string) => {
    lastMessage = null;

    process.stdout.write(char);
});



function write(channel: EStdChannel, message: string) {
    writeMutex.lock(() => {
        EVENT_EMITTER.emit("log", message);

        if(isRootContext
        && message === lastMessage?.message) {
            try {
                process[channel].moveCursor(
                    (!lastMessage.isMultiline
                    ? (devConfig.appNameShort.length + lastMessage.message.length + 4)
                    : 0),
                    ((!lastMessage.isMultiline || (lastMessage.count > 1))
                    ? -1
                    : 0)
                );
                process[channel].clearLine(1);
                
                process[channel].write(`${highlight(`(${++lastMessage.count})`, [ 255, 0, 0 ])}\n`);
            } catch { /**/ }

            return;
        }

        lastMessage = {
            count: 1,
            isMultiline: /\n/.test(message),
            message: message
        };

        // TODO: Type based formatting

        message
        && process[channel].write(`${isRootContext
            ? `${highlight(` ${devConfig.appNameShort} `, [
                [ 54, 48, 48, EColorMode.FG ], [ 255, 254, 173, EColorMode.BG ]
            ], [ 1, 3 ])} `
            : ""
        }${message}\n`);
    });
}

function highlight(str: string, color: TColor|TColor[], styles?: number|number[]) {
    return `${
        ((typeof((color || [])[0]) === "number"
        ? [ color ]
        : color || []) as TColor[])
        .map((c: TColor) => {
            return `\x1b[${(c.length > 3) ? c.pop() : EColorMode.FG};2;${c.join(";")}m`;
        })
        .join("")
    }${
        styles ? [ styles ].flat().map(s => `\x1b[${s}m`).join("") : ""
    }${str}\x1b[0m`;
}

function logToFile(message: string) {
    // TODO: Implement
}


export function info(message: unknown) {
    write(EStdChannel.OUT, String(message));
}

export function debug(message: unknown) {
    if(!MODE.DEV) {
        return;
    }
    
    write(EStdChannel.OUT, String(message));
}

export function error(err: Error|string) {
    if(!(err instanceof Error)) {
        write(EStdChannel.OUT, highlight(err, [ 224, 0, 0 ]));

        return;
    }
    
    const message = `${err.name}: ${err.message}`;

    write(EStdChannel.ERR, `${
        highlight(message, [ 224, 0, 0 ])
    }${
        err.stack
        ? `\n${highlight(err.stack.replace(message, "").trim(), null, 2)}`
        : ""
    }`);
}