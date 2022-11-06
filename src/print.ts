const devConfig = {
    "appNameShort": "rJS"
};


import cluster from "cluster";
import { isMainThread } from "worker_threads";
import { existsSync, mkdirSync, statSync, appendFile } from "fs";
import { join } from "path";

import { EVENT_EMITTER } from "./EVENT_EMITTER";
import { MODE } from "./MODE";
import { parseOption } from "./args";


type TColor = [ number, number, number, EColorMode? ];

enum EStdChannel {
    OUT = "stdout",
    ERR = "stderr"
}

enum EColorMode {
    FG = "38",
    BG = "48"
}


const isRootContext: boolean = cluster.isPrimary && isMainThread;

let lastMessage: {
    count: number;
    isMultiline: boolean;
    message: string;
};
let logDirPath: string;
setImmediate(() => {
    let testLogDirPath: string = parseOption("log-dir", "L").string;

    if(!testLogDirPath) {
        return;
    }
    testLogDirPath = join(process.cwd(), testLogDirPath);

    if(!existsSync(testLogDirPath)) {
        try {
            mkdirSync(testLogDirPath);
        } catch {
            throw new ReferenceError(`Given log directory neither exist nor can be created at path '${testLogDirPath}'`);
        }
    }
    if(!statSync(testLogDirPath).isDirectory()) {
        throw new RangeError(`Given log directory is not a directory '${testLogDirPath}'`);
    }

    logDirPath = testLogDirPath;
});


process.stdin.on("data", (char: string) => {
    lastMessage = null;

    process.stdout.write(char);
});


function stringify(message: unknown): string {
    const flatten = (objStr: string, quote: string) => {
        return objStr
        .replace(new RegExp(`\\\\${quote}`, "g"),"\uFFFF")
        .replace(new RegExp(`${quote}([^${quote}]+)${quote}:`, "g"), "$1:")
        .replace(/\uFFFF/g, `\\\\${quote}`);
    };

    return (typeof message !== "string")
    ? flatten(flatten(JSON.stringify(message), "\""), "\'")
    : message;
}

function write(channel: EStdChannel, message: unknown) {    
    const serializedMessage: string = stringify(message);

    message = (channel === EStdChannel.OUT)
    ? formatMessage(serializedMessage)
    : message;

    if(isRootContext) {
        if(message === lastMessage?.message) {
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
                
                process[channel]
                .write(`${highlight(`(${++lastMessage.count})`, [ 255, 92, 92 ])}\n`);
            } catch { /**/ }

            return;
        }

        EVENT_EMITTER.emit("log");

        logToFile(message);
    }

    lastMessage = {
        count: 1,
        isMultiline: /\n/.test(serializedMessage),
        message: serializedMessage
    };
    
    process[channel]
    .write(`${isRootContext
        ? `${highlight(` ${devConfig.appNameShort} `, [
            [ 54, 48, 48, EColorMode.FG ], [ 255, 254, 173, EColorMode.BG ]
        ], [ 1, 3 ])} `
        : ""
    }${colorMessage(serializedMessage)}\n`);
}
/* info({
    "foo": true,
    bar: 12341,
    baz: 'hello world {',
    cuux: [
        {
            'zip': "hello \" universe"
        }
    ]
}); */

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

function formatMessage(message: string) {
    // Type based formatting
    try {
        JSON.parse(message);
        
        // TODO: Object
    } finally {
        return message;
    }
}

function colorMessage(message: string) {
    return message
    .replace(/(^|\s|[\[\(])([0-9]+([.,-][0-9]+)*)(\s|[^a-z0-9;]|$)/gi, `$1${highlight("$2", [ 0, 167, 225 ])}$4`);   // Number
}

export function info(message: unknown) {
    write(EStdChannel.OUT, message);
}

export function debug(message: unknown) {
    if(!MODE.DEV) {
        return;
    }
    
    write(EStdChannel.OUT, message);
}

export function error(err: Error|string) {
    if(!(err instanceof Error)) {
        write(EStdChannel.ERR, highlight(err, [ 224, 0, 0 ]));

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

export function logToFile(message: unknown) {
    if(!logDirPath) {
        return
    }

    message = stringify(message)
    .replace(/\x1b\[[0-9;]+m/g, "");    // Remove possibly occurring ANSII formatting codes

    const date: Date = new Date();
    const day: string = date.toISOString().split("T")[0];
    const time: string = date.toLocaleTimeString();

    appendFile(join(logDirPath, `${day}.log`),
    `[${time}]: ${message}\n`,
    err => {
        if(!err) {
            return;
        }

        throw new Error(`Could not write to log directory. ${err?.message ?? message}`);
    });
}