const { Test, log, formatStr } = require("./test-framework");


/**
 * Optionally set up the network environment upon which to fetch tests against.
 * @param {Function} callback Setup function to be immediately invoked.
 */
global.setupNetwork = function(callback) {
    callback();
};

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
        ? this.callReference.hostname.slice(protocol.length)
        : this.callReference.hostname;

        this.isSecure = protocol === "https://";

        const port = this.callReference.hostname.match(/\:[0-9]+$/i);
        this.callReference.port = port
        ? parseInt(port.slice(1))
        : this.isSecure
            ? 443
            : 80;
        this.callReference.hostname = port
        ? this.callReference.hostname.slice(0, -port.length)
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
                        data: data
                    });
                });
            });

            req.on("error", err => {
                reject(err);
            });

            req.end();
        });
    }

    compare(expected, actual) {
        // TODO: Implement
        
        return Test.Equality.FULL;
    }
};


log(formatStr(" NETWORK TEST SUITE ", null, [253, 202, 64], 1));