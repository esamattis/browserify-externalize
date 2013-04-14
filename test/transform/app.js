setTimeout(function() {
    t.equal(require("./external.coffee")(), "coffeemodule");
},1);
