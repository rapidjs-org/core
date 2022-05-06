
const getRequestTest = new NetworkTest("GET request tests", "localhost", "GET");

// TODO: Plug-in requests (full, partial, none)

// TODO: Static request (full, none)

// TODO: Dynamic request (compound, non-compound) x (full, none)

getRequestTest
.conduct("Fetch conventional page")
.check("/sub/conventional")
.for({
    status: 200,
    headers: {
        "server": "rapidJS"
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

// Redirects

getRequestTest
.conduct("Redirect dynamic extension name explicit")
.check("/test/page.html")
.for({
    status: 301,
    headers: {
        "location": "http://localhost/test/page"
    }
});

getRequestTest
.conduct("Redirect dynamic index name explicit")
.check("/index")
.for({
    status: 301,
    headers: {
        "location": "http://localhost/"
    }
});

getRequestTest
.conduct("Redirect both dynamic index and extension name explicit")
.check("/test/index.html")
.for({
    status: 301,
    headers: {
        "location": "http://localhost/test/"
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