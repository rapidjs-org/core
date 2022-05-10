
const patchRequestTest = new NetworkTest("Unsupported method request test", "localhost", "PATCH");


patchRequestTest
.conduct("Fetch data")
.check("/test")
.for({
    status: 405,
    headers: {
        "server": "rapidJS"
    }
});