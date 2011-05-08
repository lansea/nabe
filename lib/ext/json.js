
var http = require('http'),
config = require('../config'),
renderer = require('../renderer');

/**
* Define a custom renderJSON method on ServerResponse.
*
* Usage:
*  res.renderJSON({foo: 'bar'})
*/
Object.defineProperty(http.ServerResponse.prototype, 'renderJSON', {
  value: function(data) {
    
    data = JSON.stringify(data);
  
    this.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    });
  
    this.end(data);
  }
});


module.exports = function json(o) {
  
  console.log('init json layer > ', o);
  
  // the renderer is an instance of events.EventEmitter
  // that any module can require and provide/subscribe to custom events
  renderer.on('nabe.render', function(res, data){
    var a = data.headers ? data.headers.accept : undefined;
    if(a && /application\/json/.test(a)) {
      delete data.headers;
      
      res.renderJSON(data);
    }
    
    // or you can edit and alter the data object then use to render template files
    data.foo = "data added on nabe.render event";
  });
  
  return function json(req, res, next) {
    // trigger on each routes not handled by the main blog layer
    var a = req.headers.accept;
    if(a && /application\/json/.test(a)) {
      return res.renderJSON({
        description: 'a simple example of a pluggable connect layer'
      });
    }
    
    next();
  };
};