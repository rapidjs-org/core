const { join } = require("path");
const { existsSync } = require("fs");

const { testDirPath, Test, log, Color, formatStr } = require("./test-framework");


/*
 * Retrieve optional last test case passed as CLI argument (second).
 */
let lastTestTimeout;
const lastTestTimeoutLength = (parseInt(process.argv.slice(2)[1]) || 3000);
if(isNaN(lastTestTimeoutLength)) {
    throw new SyntaxError("Last test case timeout argument must be instance of integer");
}


/*
 * Perform network setup if according file given in test file directory (top-level).
 */
const setupFilePath = join(testDirPath, "network.setup.js");
if(existsSync(setupFilePath)) {
    log(`\n${formatStr(" NETWORK SETUP ", Color.WHITE, Color.GRAY, 1)}`);

    require(setupFilePath);
}


/**
 * network test class to be used for HTTP entity comparison.
 * @class
 */
global.NetworkTest = class extends Test {
    constructor(purposeDescriptor, hostname, method = "GET") {
        super(purposeDescriptor, {
            hostname, method
        });

        const protocol = this.callReference.hostname.match(/^https:\/\//i);
        this.callReference.hostname = protocol
        ? this.callReference.hostname.slice(protocol[0].length)
        : this.callReference.hostname;

        this.isSecure = ((protocol || [""])[0] === "https://");
        
        const port = this.callReference.hostname.match(/\:[0-9]+$/i);
        this.callReference.port = port
        ? parseInt(port.slice(1))
        : this.isSecure
            ? 443
            : 80;
        this.callReference.hostname = port
        ? this.callReference.hostname.slice(0, -port[0].length)
        : this.callReference.hostname;
    }

    call(path) {
        return new Promise((resolve, reject) => {
            const req = require(`http${this.isSecure ? "s" : ""}`).request({
                hostname: this.callReference.hostname,
                port: this.callReference.post,
                path: path,
                method: this.callReference.method,
            }, res => {
                res.on("data", data => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: String(data)
                    });
                });
            });

            req.on("error", err => {
                reject(err);
            });

            req.end();

            clearInterval(lastTestTimeout);
            lastTestTimeout = setTimeout(_ => {
                process.exit(0);
            }, lastTestTimeoutLength);
        });
    }

    compare(expected, actual) {
        if(expected.status
        && expected.status != actual.status) {
            return Test.Equality.NONE;
        }

        for(const key in expected.headers) {
            if(!actual.headers[key]
            || expected.headers[key] != actual.headers[key]) {
                return Test.Equality.NONE;
            }
        }

        if(expected.data
        && String(expected.data) != String(actual.data)) {
            return Test.Equality.NONE;
        }

        return Test.Equality.FULL;
    }
};


log(formatStr(" NETWORK TEST SUITE ", null, [253, 202, 64], 1));