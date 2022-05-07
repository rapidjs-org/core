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
    console.log(body);
    console.log(req);

    return {
        "def": Math.round(Math.random() * 10)
    };
}, {
    name: "abc",
    useCache: true
});

module.exports = rJS => {

    $this.endpoint(_ => {
        //throw new rJS.MutualClientError(406, "Test error");
        
        return `${retrieveName(names.first)} ${retrieveName(names.last)} ${Math.round(Math.random() * 10)}`;
    });
    
};