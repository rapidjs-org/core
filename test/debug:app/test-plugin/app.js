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

// Initialize frontend module with relative path to file
$this.clientModule("./client");

// Define the default endpoint
// Returns (responds with) generated name
$this.endpoint(_ => {
    return `${retrieveName(names.first)} ${retrieveName(names.last)} ${Math.round(Math.random() * 10)}`;
});

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