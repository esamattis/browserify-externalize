// SHARED MODULE
require("./inner");

var i = 0;
module.exports = function() {
    return ++i;
};
