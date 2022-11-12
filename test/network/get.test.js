assert("Successful request", {
    url: "/foo.bar"
}, {
    status: 200,
    headers: {
        "Content-Length": 3
    },
    message: "foo"
});

assert("Failing request", {
    url: "/baz.qux"
}, {
    status: 404,
    message: "baz"
});