
var browserify = require('browserify');
var coffeeify = require('coffeeify');
var vm = require('vm');
var test = require('tap').test;

var externalize = require("../index");

test('inner dep shared with multiple modules in external bundle', function (t) {
    t.plan(1);

    var parentBundle = browserify([__dirname + '/transform/app.js']);
    var externalBundle = browserify().require(__dirname + '/transform/external.coffee');
    parentBundle.transform(coffeeify);
    externalBundle.transform(coffeeify);

    externalize(parentBundle, externalBundle, function(err) {
        if (err) throw err;
        parentBundle.bundle(function(err, parentSrc) {
            if (err) throw err;
            externalBundle.bundle(function(err, extSrc) {
                if (err) throw err;

                var c = {
                    setTimeout: setTimeout,
                    console: console,
                    t: t
                };
                var src = parentSrc + ";" + extSrc;
                vm.runInNewContext(src, c);

            });
        });
    });

});

