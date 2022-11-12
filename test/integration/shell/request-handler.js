module.exports = sReq => {
    return (sReq.url.pathname === "/foo.bar")
    ? {
        status: 200,
        message: "baz"
    }
    : {
        status: 404,
        message: "qux"
    };
};