
const getRequestTest = new NetworkTest("GET request tests", "localhost", "GET");

getRequestTest
.conduct("Fetch correct response to static asset")
.check("/")
.for({
    status: 200,
    headers: {
        server: "nginx"
    }
});