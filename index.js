
var util = require("util");
var mdeps = require('module-deps');
var concatStream = require('concat-stream');
var EventEmitter = require("events").EventEmitter;

function BundleManager(bundles) {
    this.bundles = bundles;
    this.bundles.forEach(function(b) {
        b.on("_ready", function() {
            if (this.isAllReady()) {
                this.emit("ready");
            }
        }.bind(this));
    }.bind(this));
}

util.inherits(BundleManager, EventEmitter);

BundleManager.prototype.isAllReady = function() {
    return this.bundles.every(function(b) {
        return b._pending === 0;
    });
};


function externalize(parentBundle, externals, cb) {
    if (!Array.isArray(externals)) externals = [externals];
    var bm = new BundleManager([parentBundle].concat(externals));
    if (!bm.isAllReady()) {
        return bm.once("ready", function() {
            externalize(parentBundle, externals, cb);
        });
    }

    var count = externals.length;
    mdeps(parentBundle.files).pipe(concatStream(function(err, parentModules) {
        externals.forEach(function(extBundle) {
            mdeps(extBundle.files).pipe(concatStream(function(err, extModules) {

                console.error("DOING MY SHIT!");

                var filteredParentModules = parentModules.filter(function(parentDep) {
                    // Pick only those that are not in the external bundle
                    return !extModules.some(function(extModule) {
                        return parentDep.id === extModule.id;
                    });
                });

                extModules.forEach(function(extModule) {
                    var parentModuleDepends = filteredParentModules.some(function(parentModule) {
                        return Object.keys(parentModule.deps).some(function(depKey) {
                            return parentModule.deps[depKey] === extModule.id;
                        });
                    });

                    if (parentModuleDepends && !extBundle.exports[extModule.id]) {
                        console.error("parent depends on ext module", extModule.id, "making requireable!");
                        parentBundle.require(extModule.id);
                        extBundle.external(extModule.id);
                    }
                    else {
                        console.error("removing", extModule.id, "from parent");
                        parentBundle.external(extModule.id);
                    }
                });
                if (--count === 0) cb();
            }));
        });
    }));
}

module.exports = externalize;
