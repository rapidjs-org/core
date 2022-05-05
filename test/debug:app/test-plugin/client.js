$this.PUBLIC.testEndpoint = _ => {
    $this.endpoint()
    .then(message => {
        console.log(message);
    }).catch(_ => {
        console.log("Try again later");
    });
};

$this.PUBLIC.testNamedEndpoint = _ => {
    $this.endpoint({
        abc: 123
    }, {
        name: "abc"
    })
    .then(message => {
        console.log(message);
    }).catch(_ => {
        console.log("Try again later");
    });
};