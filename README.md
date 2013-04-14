[![build status](https://secure.travis-ci.org/epeli/browserify-externalize.png)](http://travis-ci.org/epeli/browserify-externalize)

# Browserify Externalize

Create external [Browserify][] bundles for lazy asynchronous loading

## Install

    npm install browserify-externalize

## API

The module exports a single function

```
externalize(
    <parent bundle or array of parent bundles>,
    <bundle or arrays of bundles to be externalized from the parent bundles>,
    <callback fucntion>
);
```

## Example

Create two bundles where the second one is a subset of the parent and call
`externalize(parent, subset, callback)` on them. It will do following:

  1. Moves all modules that are used in both to the parent one
  1. Removes those modules from the parent one that are explicitly requireable
     in the subset one
  1. It generally tries to do the "right thing"

in code:

```javascript
var fs = require("fs");
var browserify = require("browserify");
var externalize = require("browserify-externalize");

// Parent bundle with an entry point
var parent = browserify("./index.js");

// Make subset bundle from external.js by making it explicitly requireable
var second = browserify().require("./external.js");

// Remove the subset bundle code from the parent
externalize(parent, subset, function(err) {
    if (err) throw err;

    // Write bundles to files after externalization
    parent.bundle.pipe(fs.createWriteStream("bundle/parent.js");
    second.bundle.pipe(fs.createWriteStream("bundle/second.js");
});
```

index.js

```javascript
// would not work here because external.js is externalized to the subset bundle
// require("./external");

// Use any script loader to load the subset bundle to make the require work
// again
jQuery.getScript("bundle/second.js", function(){
    var value = require("./external");
    // Alerts: "external module: external module contents"
    alert("external module: " + value);
});
```

external.js:

```javascript
module.exports = "external module contents";
```

[Browserify]: https://github.com/substack/node-browserify
