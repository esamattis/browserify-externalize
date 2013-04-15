[![build status](https://secure.travis-ci.org/epeli/browserify-externalize.png)](http://travis-ci.org/epeli/browserify-externalize)

# externalize

Create external [Browserify][] bundles for lazy asynchronous loading

Introduction to asynchronous module loading with Browserify:

<http://esa-matti.suuronen.org/blog/2013/04/15/asynchronous-module-loading-with-browserify/>

## Install

    npm install externalize

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
var externalize = require("externalize");

// Parent bundle with an entry point
var parent = browserify("./index.js");

// Make subset bundle from external.js by making it explicitly requireable
var subset = browserify().require("./external.js");

// Remove the subset bundle code from the parent
externalize(parent, subset, function(err) {
    if (err) throw err;

    // Write bundles to files after externalization
    parent.bundle().pipe(fs.createWriteStream("bundle/parent.js"));
    subset.bundle().pipe(fs.createWriteStream("bundle/subset.js"));
});
```

index.js:

```javascript
// require("./external");
// Would not work here because external.js is externalized to the subset bundle

// Use any script loader to load the subset bundle to make the require work
// again
jQuery.getScript("bundle/subset.js", function(){
    var value = require("./external");
    // Alerts: "external module: external module contents"
    alert("external module: " + value);
});
```

external.js:

```javascript
module.exports = "external module contents";
```

## Script loaders

You need a script loader to load the external bundles. There is one in
[jQuery][getscript]. If you don't use jQuery you can grab [$script.js][]
from [npm][$script.js-npm] or implement your [own][modern] for modern browsers
easily.

Some others include:

 - [yepnope](http://yepnopejs.com/)
 - [head.js](http://headjs.com/)
 - [lab.js](http://labjs.com/)
 - [lazyload](https://github.com/rgrove/lazyload/)
 - [basket.js](http://addyosmani.github.io/basket.js/)

[Browserify]: https://github.com/substack/node-browserify
[getscript]: http://api.jquery.com/jQuery.getScript/
[$script.js]: http://dustindiaz.com/scriptjs
[$script.js-npm]: https://npmjs.org/package/scriptjs
[modern]: https://gist.github.com/epeli/5384178

