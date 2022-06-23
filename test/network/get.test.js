
const getRequestTest = new NetworkTest("GET request tests", "localhost", "GET");

// TODO: Plug-in requests (full, partial, none)


getRequestTest
.conduct("Fetch static file")
.check("/styles.css")
.for({
    status: 200,
    headers: {
        "server": "rapidJS"
    }
});

getRequestTest
.conduct("Fetch conventional page")
.check("/sub/conventional")
.for({
    status: 200,
    headers: {
        "server": "rapidJS",
        "content-length": 550
    }
});

getRequestTest
.conduct("Fetch conventional page with custom header")
.check("/sub/conventional")
.for({
    status: 200,
    headers: {
        "server": "rapidJS",
        "additional-custom-header": "test"
    }
});

getRequestTest
.conduct("Fetch compound page")
.check("/compound")
.for({
    status: 200,
    headers: {
        "server": "rapidJS"
    }
});

getRequestTest
.conduct("Fetch plug-in module")
.check("/plug-in::test")
.for({
    status: 200,
    headers: {
        "server": "rapidJS"
    }
});

getRequestTest
.conduct("Partially fetch plug-in modules")
.check("/plug-in::test+missing_plugin")
.for({
    status: 203,
    headers: {
        "server": "rapidJS"
    }
});

// Redirects

getRequestTest
.conduct("Redirect dynamic extension name explicit")
.check("/test/page.html")
.for({
    status: 301,
    headers: {
        "location": "/test/page"
    }
});

getRequestTest
.conduct("Redirect dynamic index name explicit")
.check("/index")
.for({
    status: 301,
    headers: {
        "location": "/"
    }
});

getRequestTest
.conduct("Redirect both dynamic index and extension name explicit")
.check("/test/index.html")
.for({
    status: 301,
    headers: {
        "location": "/test"
    }
});

// Errors

getRequestTest
.conduct("Fetch private file")
.check("/sub/_private-file.txt")
.for({
    status: 403,
    headers: {
        "server": "rapidJS"
    }
});

getRequestTest
.conduct("Fetch private page")
.check("/_private-page")
.for({
    status: 403,
    headers: {
        "server": "rapidJS"
    }
});

getRequestTest
.conduct("Fetch missing file")
.check("/test/anything.txt")
.for({
    status: 404,
    headers: {
        "server": "rapidJS"
    }
});

getRequestTest
.conduct("Fetch missing page")
.check("/anything")
.for({
    status: 404,
    headers: {
        "server": "rapidJS"
    }
});

getRequestTest
.conduct("Fetch missing plug-in module")
.check("/plug-in::missing_plugin")
.for({
    status: 404,
    headers: {
        "server": "rapidJS"
    }
});