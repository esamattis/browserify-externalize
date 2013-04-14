
var util = require("util");
var mdeps = require('module-deps');
var concatStream = require('concat-stream');
var EventEmitter = require("events").EventEmitter;

function once(fn) {
    var ran;
    return function() {
        if (ran) return;
        ran = true;
        return fn.apply(this, arguments);
    };
}

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


BundleManager.prototype.resolveModules = function(bWrap) {
    var self = this;

    // Dependencies can be resolved only when bundle.files is populated
    if (bWrap.bundle._pending === 0) {
        var opts = {
            resolve: bWrap.bundle._resolve.bind(bWrap.bundle),
            transform: bWrap.bundle._transforms,
            transformKey: [ 'browserify', 'transform' ]
        };

        mdeps(bWrap.bundle.files, opts).pipe(concatStream(function(err, modules) {
            if (err) return self.emit("error", err);
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


BundleManager.prototype.externalize = function(cb) {
    cb = once(cb);

    if (!this.areModulesReady()) {
        return this.once("modules-ready", this.externalize.bind(this, cb));
    }

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

        function parentNeeds(extModule) {
            // Whether the parent bundle has a require call to this module
            var depends = filteredParent.some(function(parentModule) {
                return Object.keys(parentModule.deps).some(function(depKey) {
                    return parentModule.deps[depKey] === extModule.id;
                });
            });
            // Parent doesn't really need this module even if it has a require
            // call to it if it is moved to external bundle by the user
            var requireMoved = ext.bundle.exports[extModule.id];
            return depends && !requireMoved;
        }

        var i, extModule, parentMissing;

        // Shared modules
        for (i = 0; i < ext.modules.length; i += 1) {
            extModule = ext.modules[i];
            parentMissing = filteredParent.indexOf(extModule) === -1;
            if (parentNeeds(extModule) && parentMissing) {
                // Parent and the external bundle uses this module. Make it
                // requireable from the parent bundle and remove it from the
                // external bundle.
                parent.require(extModule.id);
                ext.bundle.external(extModule.id);
                // Put the module back to parent module list and start loop
                // from begining to get it's dependencies too.
                filteredParent.push(extModule);
                i = 0;
            }
        }

        // External only modules
        for (i = 0; i < ext.modules.length; i += 1) {
            extModule = ext.modules[i];
            if (!parentNeeds(extModule)) {
                // Remove the module from the parent bundle even if it has a
                // require call to it. That require call will start working
                // again when this external bundle is added to the dom. This
                // will also remove all inner dependencies of the external
                // module from the parent bundle.
                parent.external(extModule.id);
            }
        }

    });

    cb();
};

module.exports = function externalize(parents, externals, cb) {
    cb = once(cb);
    parents = [].concat(parents);
    var count = parents.length;
    parents.forEach(function(parent) {
        var bm = new BundleManager([parent].concat(externals));
        bm.externalize(function(err) {
            count--;
            if (err) return cb(err);
            if (count === 0) return cb();
        });
    });
};

