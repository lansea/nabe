// Just a basic server setup for this site
var nabe = require('./lib/node-yabe'),
config = nabe.config;

nabe.listen(config.port);

console.log('Node server is running! and listening on', config.port);