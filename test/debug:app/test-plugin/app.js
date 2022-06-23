
$this.render(markup => {
    return markup.replace(/@RENDER/g, "<b>RENDERING WORKS</b>");
}, {
    static: true
});


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


const fixed = Math.round(Math.random() * 100);

//console.log(fixed);

const retrieveName = list => {
    return list[Math.round(Math.random() * (list.length - 1))];
};


$this.clientModule("./client");



$this.endpoint((body) => {
    if(!body) {
        throw new ReferenceError("Body is empty");
    }
    
    return body.abc;
});

$this.endpoint((_, req) => {
    console.log(req);

    return `${retrieveName(names.first)} ${retrieveName(names.last)} (fixed: ${fixed})`;
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
        const refTime = new Date().getTime() + 3000;
        
        while (new Date().getTime() < refTime) {}

        return "No timeout";
    }, {
        name: "timeout"
    });
    
};