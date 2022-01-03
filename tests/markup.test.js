const markup = require("../dist/utilities/markup");

test("Injects character sequece into given markup string's head tag as child content",
markup.injectIntoHead(`
<html>
    <head>
        <title>Test</title>
    </head>
    <body>
        <h1>Test</h1>
    </body>
</html>
`, "<!-- TEST -->")).for(`
<html>
    <head><!-- TEST -->
        <title>Test</title>
    </head>
    <body>
        <h1>Test</h1>
    </body>
</html>
`);

test("Returns given markup unaffected as no head tag present",
markup.injectIntoHead(`
<html>
    <body>
        <h1>Test</h1>
    </body>
</html>
`, "<!-- TEST -->")).for(`
<html>
    <body>
        <h1>Test</h1>
    </body>
</html>
`);