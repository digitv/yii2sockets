var conf = require('./config.js');
var server = require('./lib/server');

server.start(conf);

console.log('*** Server started ***');