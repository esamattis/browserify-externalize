t.equal(require("./shared")(), 1);

setTimeout(function() {
    require("./external");
},1);
