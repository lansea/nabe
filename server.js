// Just a basic server setup for this site
var yabe = require('./lib/node-yabe'),
config = require('./lib/config'),
json = require('./lib/ext/json');

yabe
  .use(json( {foo: 'bar'} ))
  .listen(9599);

console.log('Node server is running! and listening on', config.port);