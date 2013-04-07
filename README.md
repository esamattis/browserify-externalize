[![build status](https://secure.travis-ci.org/epeli/browserify-externalize.png)](http://travis-ci.org/epeli/browserify-externalize)

# Browserify Externalize

Create external Browserify bundles for lazy asynchronous loading.

## Install

    npm install browserify-externalize

## Usage

Create two bundles where the second one is a subset of the first the one and
call `externalize(first, second, callback)` on them. It will do following:

  1. Moves all modules that are used in both to the first one
  1. Removes those modules from the first one that are explicitly requireable
     in the second one
  1. It generally tries to do the "right thing"

Example:

index.js

```javascript
alert("First bundle loaded");

/*
require("./external"); // would not work here
*/

// Create callback for the second bundle
window.secondBundleCallback = function() {
    var value = require("./external");

    // Alerts: external module: external module contents
    alert("external module: " + value);
}

jQuery.getScript("bundle/second.js");
```

external.js:

```javascript
module.exports = "external module contents";
```

index2.js:

```javascript
// This will be executed when the second bundle is added to the dom
setTimeout(function(){
    // Call the callback we created
    window.secondBundleCallback();
}, 1);
```

build script:

```javascript
var fs = require("fs");
var browserify = require("browserify");
var externalize = require("browserify-externalize");

var main = browserify("./index.js");
var second = browserify("./index2.js");

// Make external module explicitly available when the second bundle is added to
// the dom
second.require("./external.js");

externalize(main, second, function(err) {
    if (err) throw err;

    // Write bundles to files after externalization
    main.bundle.pipe(fs.createWriteStream("bundle/main.js");
    second.bundle.pipe(fs.createWriteStream("bundle/second.js");
});
```
