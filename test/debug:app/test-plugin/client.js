$this.PUBLIC.generate = field => {
    $this.endpoint()
    .then(message => {
        field.textContent = message || "";
    }).catch(_ => {
        field.textContent = "Try again later";
    });
};