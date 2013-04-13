
var browserify = require('browserify');
var vm = require('vm');
var test = require('tap').test;

var externalize = require("../index");

test('inner dep shared with multiple modules in external bundle', function (t) {
    t.plan(4);

    var parentBundle = browserify([__dirname + '/shared_inner/app.js']);
    var externalBundle = browserify().require(__dirname + '/shared_inner/external.js');

    externalize(parentBundle, externalBundle, function(err) {
        if (err) throw err;
        parentBundle.bundle(function(err, parentSrc) {
            if (err) throw err;
            externalBundle.bundle(function(err, extSrc) {
                if (err) throw err;

                t.ok(parentSrc.match(/INNER DEP/), "inner dep code must be in parent src");
                t.notOk(extSrc.match(/INNER DEP/), "inner dep code must not be in external bundle");

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

