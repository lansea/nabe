
# Custom module

A simple example of how to build a custom connect layer on top of nabe.

This branch adds a little hook just before rendering on which you could subscribe to.

    var renderer = require('../renderer');
    
    
    renderer.on('nabe.render', function(res, data){
      var a = data.headers ? data.headers.accept : undefined;
      if(a && /application\/json/.test(a)) {
        res.renderJSON(data);
      }
    });
    

The json module acting as an example basically allows to expose model with raw json objects instead of serving template files.

We could then request nabe like so:

    $.getJSON('/', function(data){console.log(data);});
    
    
    // where :post is the filename, minus the markdown suffix.
    $.getJSON('/article/:post', function(data){console.log(data);});

Actually, each routes exposed by nabe, if requested with `application/json` will render a response with raw json.

Alternately, any url not previously handled by the main connect layer, if requested with `application/json`, will render the following response:

    {description: 'a simple example of a pluggable connect layer'}
    
## Tests

You must have api-easy installed to run the tests. Just run `npm install api-easy` if that's not the case.

Run `vows tests/*.js --spec` to run the basic test suite that quickly validates different json response from the server.
    

## Usage

    // Just a basic server setup
    var nabe = require('nabe'),
    config = nabe.config;

    nabe
      .use(require('./lib/modules/json')( {foo: 'bar'} ))
      .listen(config.port);

    console.log('Node server is running! and listening on', config.port);