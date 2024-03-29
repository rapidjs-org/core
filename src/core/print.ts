/**
 * Module representing application specific console output
 * functionality implementing a scoping prefix and uniformal
 * std channel formatting.
 */

import _config from "./_config.json";


import { appendFile } from "fs";
import { join } from "path";

import { AsyncMutex } from "./AsyncMutex";


/*
 * RGB color triple (4-tuple with optional coloring mode { FG, BG }).
 */
type TColor = [ number, number, number, EColorMode? ];


enum EStdChannel {
    OUT = "stdout",
    ERR = "stderr"
}

enum EColorMode {
    FG = "38",
    BG = "48"
}


interface ILastMessage {
    count: number;
    isMultiline: boolean;
    data: string;
}


const fileWriteMutex: AsyncMutex = new AsyncMutex();
const lastLog: {
    dir?: string,
    message?: ILastMessage
} = {};


function stringify(message: unknown): string {
    const flatten = (objStr: string, quote: string) => {
        return objStr
        .replace(new RegExp(`\\\\${quote}`, "g"),"\uFFFF")
        .replace(new RegExp(`${quote}([^${quote}]+)${quote}:`, "g"), "$1:")
        .replace(/\uFFFF/g, `\\\\${quote}`);
    };

    return (typeof message !== "string")
    ? flatten(flatten(JSON.stringify(message), "\""), "'")
    : message;
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

function colorMessage(message: string) {
    return message
    .replace(/(^|\s|[[(])([0-9]+([.,-][0-9]+)*)(\s|[^a-z0-9;]|$)/gi, `$1${highlight("$2", [ 0, 167, 225 ])}$4`);   // Number
}

function formatMessage(message: string) {
    // Type based formatting
    try {
        JSON.parse(message);
        
        // TODO: Object
    } catch { /**/ }

    return message;
}

function write(channel: EStdChannel, message: unknown, logDir?: string) {    
    const serializedMessage: string = stringify(message);

    message = (channel === EStdChannel.OUT)
    ? formatMessage(serializedMessage)
    : message;

    /* if(lastLog.message
    && (!logDir || logDir === lastLog.dir)
    && message === lastLog.message.data) {
        try {
            process[channel].moveCursor(
                (!lastLog.message.isMultiline
                ? (_config.appNameShort.length + lastLog.message.data.length + 4)
                : 0),
                ((!lastLog.message.isMultiline || (lastLog.message.count > 1))
                ? -1
                : 0)
            );
            process[channel].clearLine(1);  // TODO: Fix
            
            process[channel]
            .write(`${highlight(`(${++lastLog.message.count})`, [ 255, 92, 92 ])}\n`);
        } catch {}

        return;
    } */

    lastLog.dir = logDir;
    lastLog.message = {
        count: 1,
        isMultiline: /\n/.test(serializedMessage),
        data: serializedMessage
    };
    
    if(!logDir) {
        process[channel]
        .write(`${
            highlight(` ${_config.appNameShort} `, [
                [ 54, 48, 48, EColorMode.FG ], [ 255, 254, 173, EColorMode.BG ]
            ], [ 1, 3 ])
        } ${colorMessage(serializedMessage)}\n`);

        return;
    }

    message = stringify(message)
    .replace(/\x1b\[[0-9;]+m/g, "");    // Remove possibly occurring ANSII formatting codes

    const date: Date = new Date();
    const day: string = date.toISOString().split("T")[0];
    const time: string = date.toLocaleTimeString();
    
    appendFile(join(logDir, `${day}.log`),
    `[${time}]: ${message}\n`,
    err => {
        if(!err) {
            return;
        }

        throw new Error(`Could not write to log directory. ${err?.message ?? message}`);
    });
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

// TODO: Log file rotation


export function info(message: unknown, logDir?: string) {
    write(EStdChannel.OUT, message, logDir);
}

export function error(err: Error|string, logDir?: string) {
    if(!(err instanceof Error)) {
        write(EStdChannel.ERR, highlight(err, [ 224, 0, 0 ]));

        return;
    }

    const message = `${err.name}: ${err.message}`;
    
    fileWriteMutex.lock(() => {    
        write(EStdChannel.ERR, `${
            highlight(message, [ 224, 0, 0 ])
        }${
            err.stack
            ? `\n${highlight(err.stack.replace(message, "").trim(), null, 2)}`
            : ""
        }`, logDir);
    });
}