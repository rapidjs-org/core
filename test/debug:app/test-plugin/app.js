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
    return `${retrieveName(names.first)} ${retrieveName(names.last)}`;
});

$this.namedEndpoint("abc", _ => {
    return "def";
});