
# Custom module

A simple example of how to build a custom connect layer on top of node-yabe.

This branch adds a little hook just before rendering on which you could subscribe to.

    var mediator = require('../mediator');
    
    
    mediator.on('yabe.render', function(res, data){
      var a = data.headers ? data.headers.accept : undefined;
      if(a && /application\/json/.test(a)) {
        res.renderJSON(data);
      }
    });
    

The json module acting as an example basically allows to expose model with raw json objects instead of serving template files.

We could then request yabe like so:

    $.getJSON('/', function(data){console.log(data);});
    
    
    // where :post is the filename, minus the markdown suffix.
    $.getJSON('/article/:post', function(data){console.log(data);});

Actually, each routes exposed by node-yabe, if requested with `application/json` will render a response with raw json.

Alternately, any url not previously handled by the main connect layer, if requested with `application/json`, will render the following response:

    {description: 'a simple example of a pluggable connect layer'}
    

## Usage

    // Just a basic server setup
    var yabe = require('./lib/node-yabe'),
    config = require('./lib/config');

    yabe
      .use(require('./lib/modules/json')( {foo: 'bar'} ))
      .listen(config.port);

    console.log('Node server is running! and listening on', config.port);