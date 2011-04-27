// Just a basic server setup for this site
var connect = require('connect'),
yabe = require('./lib/node-yabe'),
config = require('./lib/config'),
json = require('./lib/ext/json'),
pages = require('./lib/ext/pages'),
github = require('./lib/ext/github');

yabe
  
  // these custom connects layer may be merged in node-yabe
  .use(pages())
  
  .use(github())
  
  .use(json( {foo: 'bar'} ))
  
  .use(connect.errorHandler({
    stack: true,
    message: true,
    dump: true
  }))
  
  .listen(config.port);

console.log('Node server is running! and listening on', config.port);