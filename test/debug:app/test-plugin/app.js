const names = {
    first: [
        "Daring",
        "Curious",
        "Super"
    ],
    last: [
        "Coder",
        "Dev",
        "Scripter"
    ]
};

const retrieveName = list => {
    return list[Math.round(Math.random() * (list.length - 1))];
};


$this.clientModule("./client");



$this.endpoint((body, req) => {
    if(!body) {
        throw new ReferenceError("Body is empty");
    }
    
    return body.abc;
});

$this.endpoint((_, req) => {
    console.log(req.ip);

    return `${retrieveName(names.first)} ${retrieveName(names.last)}`;
}, {
    name: "name"
});
    
$this.endpoint(_ => {
    return `Random number: ${Math.round(Math.random() * 10)}`;
}, {
    name: "cache",
    useCache: true
});


module.exports = rJS => {

    $this.endpoint(_ => {
        throw new rJS.MutualClientError(450, "Custom mutual client error");
    }, {
        name: "mutual-error",
    });

    $this.endpoint(async _ => {
        const timeout = ms => {
            return new Promise(resolve => {
                setTimeout(resolve, ms);
            });
        };

        await timeout(3000);

        return "No timeout";
    }, {
        name: "timeout",
        useCache: true
    });
    
};