// TODO: accept units (currently defaulting to inches)
var utils = {
    dots: function(l, printer = defaultPrinter) {
        return Math.round(l * printer.resolutionDPI);
    }
};
module.exports = utils;
