var program = require('commander');
var telnet = require('telnet-client');
var PRINTERS = require('./printers');
var moment = require('moment');
var log = require('loglevel');
var Label = require('./label');
var utils = require('./utils');

// TODO: save configuration via nconf or similar?
// TODO: be able to refer to printers by name (to leverage storage of configuration)
// TODO: throw warnings when attempting to set fonts outside allowed bounds (and rounding is taking place)
// TODO: label template storage
// TODO: command chaining
// TODO: command wiring to label object
// TODO: label may also contain width/height (for continuous media)

program
    .version('0.0.1')
    .option('-c, --content <content>', 'label content as JSON')
    .option('-j, --json <parameters>', 'JSON description of printing parameters')
    .option('-v, --verbose', 'ouput useful information', (v, total) => (total === 0) ? 0 : total-1, 2)
    .option('-t, --test', 'print a test label')
    .option('-c, --check', 'dry-run; do not send label to printer')
    .parse(process.argv);

program.verbose = "debug";

console.log('loglevel: '+program.verbose);
log.setLevel(program.verbose);

var defaultPrinterModel = PRINTERS.ZEBRA_GX430T;
var defaultPrinter = Object.assign({
    name: 'Default Printer',
    address: '10.10.11.23'
}, defaultPrinterModel, program.json && program.json.printer);
var defaultMedia = {
    width: 2 * 25.4,
    length: 1 * 25.4,
    // [thermal type]
    // [thickness?]
    // [price/label?]
    // [spool size]
    // [supply quantity]
    // [model / reorder number?]
};

var dots = (l) => utils.dots(l, defaultPrinter);

var labels = {
    "basicNameBadge": {
        defaultContent: {
            fullName: 'Eric Kachelmeyer',
            region: 'Midwest',
            // businessArea: 'Coactive',
            // properties: {
            //     "Region": "Coactive",   //moment().format(),
            //     "Business Area": "Coactive"
            // },
            // url: 'example.com/labels/HelloWorld'
        },
        template: basicNameBadgeTemplate
    }
};

print();

// if (program.test) {
//     log.info('Printing a test label...');
//     print();
// } else if (program.json) {
//     log.trace('Using provided JSON printing parameters');
//     log.trace(`Provided parameters: ${JSON.stringify(program.json)}`);
//
//     print(JSON.parse(program.json));
// } else {
//     log.error('No label content provided');
// }

function print({printer = defaultPrinter, template = labels.basicNameBadge.template, content = labels.basicNameBadge.defaultContent, media = defaultMedia} = {}) {

    if (typeof template === "string" && template in labels)
        template = labels[template].template;

    log.info("Connecting to printer at " + printer.address + ':' + printer.port + "\n");

    var telnetParams = {
        host: printer.address,
        port: printer.port,
        //username: 'admin',
        password: printer.password
    };

    var label = template(content);
    var cmd = label.text;

    log.debug("Command: "+cmd);
    console.log('program keys: '+ JSON.stringify(Object.keys(program)));
    if (program.check) {
        log.info('dry-run; exiting...');
        process.exit(0);
    }

    var connection = new telnet();

    connection.on('connect', function(prompt) {
        connection.exec(cmd, {shellPrompt: ""}, function(response) {
            log.debug(response);
        });
    });

    connection.on('timeout', function() {
        log.error('socket timeout!');
        connection.end();
    });

    connection.on('close', function() {
        log.info('connection closed');
    });

    connection.connect(telnetParams);
}

function invalidParameterError(name, arg) {
    log.error("Invalid value for for parameter '" + name + "'");
}

function basicTemplate() {
    return new Label()
        .fieldOrigin(dots(0.1),0, 0)
        .setFont('D','N',dots(0.120),dots(0.067))
        .fieldData("Paul Weiss")

        .fieldOrigin(dots(0.6),0, 0)
        .setFont('D','N',dots(0.120),dots(0.067))
        .fieldData("Paul Weiss")
        .end();
}

function basicNameBadgeTemplate(label) {
    return new Label()
        .labelHome(dots(0.1),dots(0.1))

        // Full Name
        .fieldOrigin(dots(0.1),dots(0.35), 0)
        .setFont('0', 'N', dots(0.3))
        .fieldBlock(700, 8, 0, 'C')
        .fieldData(label.fullName)

        .fieldOrigin(dots(0.1),dots(0.85), 0)
        .setFont('U')
        .fieldBlock(700, 8, 0, 'C')
        .fieldData(label.region)

        //CAI Logo
        .fieldOrigin(dots(0.1), dots(1.3), 0)
        .imageLoad('E:CAI.GRF')
        //.setFont('0', 'N', dots(0.4))
        //.fieldBlock(700, 8, 0, 'C')
        //.fieldData('CAI')


        // .setFont('D','N',dots(0.220),dots(0.167))
        // .setFontByName('N', dots(0.220), dots(0.167), 'Ravie', 'ttf')
        //.setFont('B','N',dots(0.220),dots(0.167))

        // .setFontByName('N', dots(0.120), dots(0.067), 'Ravie', 'ttf')


        // QR Code
        // .fieldOrigin(0,dots(0.15))
        // .qr({text: label.url})

        // Properties
        // .fieldOrigin(dots(0.6),dots(0.15))
        // .setFont('D','N',dots(0.07),dots(0.035))
        // .fieldBlock(dots(1.6),8)
        // .fieldData(Object.keys(label.properties).map((key) => key + ": " + label.properties[key]).join('\\&'))

        // URI
        // .fieldOrigin(dots(0.1),dots(0.85))
        // .setFont('0','N',22,18)
        // .fieldData(label.url)
        .end()
}
