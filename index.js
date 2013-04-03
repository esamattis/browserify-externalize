
var util = require("util");
var mdeps = require('module-deps');
var concatStream = require('concat-stream');
var EventEmitter = require("events").EventEmitter;

function BundleManager(parent, externalBundles) {
    this.parent = parent;
    this.externalBundles = externalBundles;

    var self = this;
    this.externals = [];

    externalBundles.forEach(function(b) {
        self.modules(b, function(err, modules) {
            if (err) return self.emit("error", err);
            self.externals.push({
                bundle: b,
                modules: modules
            });
            if (self.areModulesReady()) {
                self.emit("modules-ready");
            }
        });
    });
}

util.inherits(BundleManager, EventEmitter);

/**
 * Find out all dependencies of a bundle
 **/
BundleManager.prototype.modules = function(bundle, cb) {
    if (bundle._pending === 0) {
        // Dependencies can be resolved only when bundle.files is populated
        mdeps(bundle.files).pipe(concatStream(cb));
    }
    else {
        // If not ready wait until it is
        bundle.once("_ready", this.modules.bind(this, bundle, cb));
    }
};

BundleManager.prototype.areModulesReady = function() {
    return this.externalBundles.length === this.externals.length;
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

    var self = this;
    self.modules(self.parent, function(err, parentModules) {
        if (err) return cb(err);
        self.externals.forEach(function(ext) {

            // Create tree of parent modules without the external bundle modules
            var filteredParentModules = parentModules.filter(function(parentDep) {
                return !ext.modules.some(function(extModule) {
                    return parentDep.id === extModule.id;
                });
            });

            // Walk through each in the external bundle
            ext.modules.forEach(function(extModule) {

                // Whether parent bundle has a require call to this module
                var parentModuleDepends = filteredParentModules.some(function(parentModule) {
                    return Object.keys(parentModule.deps).some(function(depKey) {
                        return parentModule.deps[depKey] === extModule.id;
                    });
                });

                if (parentModuleDepends && !ext.bundle.exports[extModule.id]) {
                    // Shared module:
                    // Parent and the external module uses this  module. Make
                    // it requireable from the parent bundle and remove it from
                    // the external bundle.
                    self.parent.require(extModule.id);
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
                    self.parent.external(extModule.id);
                }
            });
        });

        cb();
    });
};

module.exports = function (parent, externals, cb) {
    var bm = new BundleManager(parent, [].concat(externals));
    bm.externalize(cb);
};

