import { MODE } from "./MODE";


const devConfig = {
    "appNameShort": "rJS"
};


type TColor = [ number, number, number, EColorMode? ];

enum EStdChannel {
    OUT = "stdout",
    ERR = "stderr"
}

enum EColorMode {
    FG = "38",
    BG = "48"
}


function write(channel: EStdChannel, message: string) {
    process[channel].write(`${
        highlight(` ${devConfig.appNameShort} `, [
            [ 54, 48, 48, EColorMode.FG ], [ 255, 254, 173, EColorMode.BG ]
        ], [ 1, 3 ])
    } ${message}\n`);
}

function highlight(str: string, color: TColor|TColor[], styles?: number|number[]) {
    return `${
        ((typeof((color || [])[0]) === "number"
        ? [ color ]
        : color || []) as TColor[])
        .map((c: TColor) => {
            return `\x1b[${(c.length > 3) ? c.pop() : EColorMode.FG};2;${c.join(";")}m`
        })
        .join("")
    }${
        styles ? [ styles ].flat().map(s => `\x1b[${s}m`).join("") : ""
    }${str}\x1b[0m`;
}

function logToFile(message: string) {
    // TODO: Implement
}


export function info(message: string) {
    write(EStdChannel.OUT, message);
}

export function debug(message: string) {
    if(!MODE.DEV) {
        return;
    }
    
    write(EStdChannel.OUT, message);
}

export function error(err: Error|string) {
    if(!(err instanceof Error)) {
        write(EStdChannel.OUT, highlight(err, [ 224, 0, 0 ]));

        return;
    }
    
    const message: string = `${err.name}: ${err.message}`;

    write(EStdChannel.ERR, highlight(message, [ 224, 0, 0 ]));
    err.stack
    && console.error(highlight(err.stack.replace(message, "").trim(), null, 2));
}