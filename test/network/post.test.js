
function pluginRequestPayload(pluginName, body, endpointName) {
    return {
        pluginName: pluginName,
        body: body,
        endpointName: endpointName
    }
}


const postRequestTest = new NetworkTest("POST request tests", "localhost", "POST");

postRequestTest
.conduct("Fetch default plug-in endpoint")
.check("/sub/conventional", pluginRequestPayload("test", { abc: 123 }))
.for({
    status: 200,
    headers: {
        "server": "rapidJS"
    },
    data: 123
});

postRequestTest
.conduct("Fetch default plug-in without body (causing internal error)")
.check("/sub/conventional", pluginRequestPayload("test"))
.for({
    status: 500,
    headers: {
        "server": "rapidJS"
    }
});

postRequestTest
.conduct("Fetch named plug-in endpoint")
.check("/sub/conventional", pluginRequestPayload("test", null, "name"))
.for({
    status: 200,
    headers: {
        "server": "rapidJS"
    }
});

postRequestTest
.conduct("Fetch plug-in endpoint with custom error")
.check("/", pluginRequestPayload("test", null, "custom-error"))
.for({
    status: 406,
    headers: {
        "server": "rapidJS"
    }
});

postRequestTest
.conduct("Fetch plug-in endpoint with timeout")
.check("/", pluginRequestPayload("test", null, "timeout"))
.for({
    status: 408,
    headers: {
        "server": "rapidJS"
    }
});

postRequestTest
.conduct("Fetch plug-in unrelated data", { abc: 123 })
.check("/")
.for({
    status: 404
});