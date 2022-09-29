const rapidJS = require("../debug/api");

// Top layer =: T
rapidJS.constrainConfig({
    name: rapidJS.ConfigType.NUMBER,
    // ...
}); // Once on top level needed only (insures sub existence / validity)

// TODO: Auto API expose???

// User =: U; T n U = ø

// Plugin config from plugin ??? once plugged pass complete specific api ($this)