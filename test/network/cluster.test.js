
const getRequestTest = new NetworkTest("GET request tests", "https://www.werder.de", "GET");

getRequestTest
.conduct("Fetch correct response to static asset")
.check("/test")
.for({
    status: 200,
    data: "ABC"
});