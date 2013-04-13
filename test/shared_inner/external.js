require("./inner");
t.equal(require("./shared")(), 2);
module.exports = "external";
