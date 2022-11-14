const { loadTest } = require("loadtest");


let mode;
while(mode = process.argv.slice(2).pop()) {
    if([ "-s", "-m", "-l" ].includes(mode)) {
        break;
    }
}
let modeOptions;
switch(mode) {
    case "-m":
        modeOptions = {
            concurrency: 10,
	        maxRequests: 1000
        };
        break;
    case "-l":
        modeOptions = {
            concurrency: 100,
            maxRequests: 10000
        };
        break;
    default:
        modeOptions = {
            concurrency: 1,
            maxRequests: 100
        };
        break;
}

let openRuns = 0;
const configurationData = [];


process.on("exit", signal => {
    if(signal !== 0) {
        return;
    }

    let count = 0;

    const printResult = data => {
        count++;

        const color = [ ((count * 64) + 128) % 256, 0, 0 ];
        Array.from({ length: count }, _ => color.unshift(color.pop()));
        
        console.log(`\x1b[38;2;${color.join(";")}m${count}. ${data.caption}\x1b[0m`);
        console.log(data.result);
        console.log(`\x1b[38;2;${color.join(";")}m${Array.from({ length: 35 }, _ => "–").join("")}\x1b[0m\n`);
    };
    
    configurationData
    .sort((a, b) => { b.result.meanLatencyMs - a.result.meanLatencyMs })
    .forEach(data => printResult(data));
});


log(`• BENCHMARK – ${mode.replace(/^-/, "").toUpperCase()}`);


function log(message) {
    process.stdout.write(`\x1b[2m${message}\n${Array.from({ length: message.length }, _ => "‾").join("")}\x1b[0m\n`);
}

async function runConfiguration(caption, serverSetupCallback) { // TODO: use different approaches / debug results
    openRuns++;

    console.log(`\x1b[2m→ ${caption}\x1b[0m\n`);

    const dynamics = serverSetupCallback();

    dynamics.onStart(_ => loadTest({
        url: "http://localhost:80",
        agentKeepAlive: true,

        ...modeOptions
    }, (error, result) => {
        dynamics.stop();

        if(error) {
            throw error;
        }
        
        configurationData.push({
            caption, result
        });
        
        !(--openRuns) && process.exit(0);
    }));
}


runConfiguration("Benchmark 1",
_ => {
    const rJS_core = require("../debug/api");

    rJS_core.shellAPI.bindRequestHandler("../test/integration/shell/request-handler");

    return {
        onStart: (callback) => {
            rJS_core.individualAPI.on("listening", callback);
        },

        stop: rJS_core.shellAPI.shutdown
    };
});


// TODO: Outsource to shared utilities?