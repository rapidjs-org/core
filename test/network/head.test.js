// TODO: Fix multiple network test instance evaluation

const headRequestTest = new NetworkTest("HEAD request tests", "localhost", "HEAD");

headRequestTest
.conduct("Fetch conventional page headers only")
.check("/sub/conventional")
.for({
    status: 200,
    headers: {
        "server": "rapidJS"
    },
    data: null
});