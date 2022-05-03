
const getRequestTest = new NetworkTest("GET request tests", "localhost", "GET");

getRequestTest
.conduct("Fetch correct response to static asset")
.check("/index.html")
.for({
    status: 200,
    headers: {
        server: "rapidJS"
    }
});

// TODO: Plug-in requests (full, partial, none)

// TODO: Static request (full, none)

// TODO: Dynamic request (compound, non-compound) x (full, none)