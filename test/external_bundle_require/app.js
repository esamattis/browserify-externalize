
t.throws(function() {
    require("./external");
}, "must not be able to require external dep before loading the external bundle");


t.equal(
    require("./shared")(), 1,
    "the main app bundle can use the shared library"
);


window.bundleLoadedCallback = function(value) {
    t.equal(require("./external"), "external");
};
