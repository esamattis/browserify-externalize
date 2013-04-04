
var util = require("util");
var mdeps = require('module-deps');
var concatStream = require('concat-stream');
var EventEmitter = require("events").EventEmitter;

function BundleManager(bundles) {
    var self = this;

    // Wrap bundles to objects containing modules
    this.bundles = bundles.map(function(bundle) {
        var bWrap = { bundle: bundle };
        self.resolveModules(bWrap);
        return bWrap;
    });

}

util.inherits(BundleManager, EventEmitter);

/**
 * Find out all dependencies of a bundle
 **/
BundleManager.prototype.resolveModules = function(bWrap) {
    var self = this;

    if (bWrap.bundle._pending === 0) {
        // Dependencies can be resolved only when bundle.files is populated
        mdeps(bWrap.bundle.files).pipe(concatStream(function(err, modules) {
            bWrap.modules = modules;
            if (self.areModulesReady()) self.emit("modules-ready");
        }));
    }
    else {
        // If not ready wait until it is
        bWrap.bundle.once("_ready", this.resolveModules.bind(this, bWrap));
    }
};

BundleManager.prototype.areModulesReady = function() {
    return this.bundles.every(function(bWrap) {
        return bWrap.modules;
    });
};


BundleManager.prototype.externalize = function(_cb) {

    if (!this.areModulesReady()) {
        return this.once("modules-ready", this.externalize.bind(this, _cb));
    }

    // Make sure the callback is called only once
    var cb = function(err) {
        _cb(err);
        _cb = function() {};
    };

    this.on("error", cb);

    var parent = this.bundles[0].bundle;
    var parentModules = this.bundles[0].modules;
    var externals = this.bundles.slice(1);

    externals.forEach(function(ext) {

        // Create tree of parent modules without the external bundle modules
        var filteredParent = parentModules.filter(function(parentDep) {
            return !ext.modules.some(function(extModule) {
                return parentDep.id === extModule.id;
            });
        });

        // Walk through each in the external bundle
        ext.modules.forEach(function(extModule) {

            // Whether the parent bundle has a require call to this module
            var parentDepends = filteredParent.some(function(parentModule) {
                return Object.keys(parentModule.deps).some(function(depKey) {
                    return parentModule.deps[depKey] === extModule.id;
                });
            });

            if (parentDepends && !ext.bundle.exports[extModule.id]) {
                // Shared module:
                // Parent and the external bundle uses this  module. Make it
                // requireable from the parent bundle and remove it from the
                // external bundle.
                parent.require(extModule.id);
                ext.bundle.external(extModule.id);
            }
            else {
                // Explicitly external bundle:
                // User marked this module as requireable on the external
                // bundle using `externalBundle.require(module)`. Remove
                // the module from the parent bundle even if it has a
                // require call to it. That require call will start working
                // again when this external bundle is added to the dom.
                // This will also remove all inner dependencies of the
                // external module from the parent bundle.
                parent.external(extModule.id);
            }
        });
    });

    cb();
};

module.exports = function(parent, externals, cb) {
    var bm = new BundleManager([parent].concat(externals));
    // var bm = new BundleManager(parent, [].concat(externals));
    bm.externalize(cb);
};

