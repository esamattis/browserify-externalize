
var browserify = require('browserify');
var vm = require('vm');
var test = require('tap').test;
var fs = require("fs");

var externalize = require("../index");

test('require(path, { expose: "name" })', function (t) {
    t.plan(1);

    var app = browserify(__dirname + "/expose/app");
    var external = browserify().require(__dirname + "/expose/external");

    app.require(__dirname + "/expose/inner-helper", { expose: "helper" });
    external.require(__dirname + "/expose/inner-helper", { expose: "helper" });

    externalize(app, external, function(err) {
        if (err) throw err;
        app.bundle(function(err, appSrc) {
            if (err) throw err;
            external.bundle(function(err, extSrc) {
                if (err) throw err;
                var c = {
                    setTimeout: setTimeout,
                    console: console,
                    t: t
                };
                var src = appSrc + ";" + extSrc;
                vm.runInNewContext(src, c);
            });
        });
    });

});
