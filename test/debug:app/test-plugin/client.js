$this.PUBLIC.testEndpoint = _ => {
    $this.endpoint({
        abc: 123
    })
    .then(message => {
        console.log(message);
    }).catch(msg => {
        console.log(msg);
        console.log("Try again later");
    });
};

$this.PUBLIC.testNamedEndpoint = _ => {
    $this.endpoint(null, {
        name: "name"
    })
    .then(message => {
        console.log(message);
    }).catch(_ => {
        console.log("Try again later");
    });
};