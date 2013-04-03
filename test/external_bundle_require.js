
var browserify = require('browserify');
var vm = require('vm');
var test = require('tap').test;
var fs = require("fs");

var externalize = require("../index");

test('require module from external bundle', function (t) {
    t.plan(7);

    var parentBundle = browserify([__dirname + '/external_bundle_require/app.js']);

    var externalBundle = browserify([__dirname + '/external_bundle_require/external_entry.js']);
    externalBundle.require(__dirname + '/external_bundle_require/external.js');

    externalize(parentBundle, externalBundle, function(err) {
        if (err) throw err;
        parentBundle.bundle(function(err, parentSrc) {
            if (err) throw err;
            externalBundle.bundle(function(err, extSrc) {
                if (err) throw err;
                fs.writeFileSync("/tmp/parent.js", parentSrc);
                fs.writeFileSync("/tmp/ext.js", extSrc);
                t.ok(
                    parentSrc.match(/SHARED MODULE/),
                    "shared module code is in main app bundle"
                );
                t.notOk(
                    extSrc.match(/SHARED MODULE/),
                    "shared module code is not in external bundle"
                );
                t.notOk(
                    parentSrc.match(/INNER DEP/),
                    "inner dependency of external.js must not appear in parent bundle"
                );
                var c = {
                    window: {},
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

