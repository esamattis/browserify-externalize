
var browserify = require('browserify');
var vm = require('vm');
var test = require('tap').test;
var fs = require("fs");

var externalize = require("../index");

test('inner dep in shared module', function (t) {
    t.plan(2);

    var parentBundle = browserify([__dirname + '/inner_in_shared/app.js']);
    var externalBundle = browserify().require(__dirname + '/inner_in_shared/external.js');

    externalize(parentBundle, externalBundle, function(err) {
        if (err) throw err;
        parentBundle.bundle(function(err, parentSrc) {
            if (err) throw err;
            externalBundle.bundle(function(err, extSrc) {
                if (err) throw err;

                fs.writeFileSync("/tmp/parent.js", parentSrc);
                fs.writeFileSync("/tmp/ext.js", extSrc);

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

