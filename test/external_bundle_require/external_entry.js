
t.equal(require("./shared")(), 2,
    "external bundle can use dependecy from main bundle"
);

setTimeout(function() {
    window.bundleLoadedCallback();
}, 1);

