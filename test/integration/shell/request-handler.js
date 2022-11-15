/*
 * Shell adapter interface.
 */
module.exports = (shellAPI) => {
    // TODO: Use <shellAPI>
    /* console.log(shellAPI);
    console.log(process.env); */

    /*
     * Request handler interface.
     */
    return (sReq) => {
        return (sReq.url.pathname === "/foo.bar")
        ? {
            status: 200,
            message: "foo"
        }
        : {
            status: 404,
            message: "baz"
        };
    };
};