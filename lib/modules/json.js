
var config = require('../config'),
mediator = require('../mediator');

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
  
  mediator.on('yabe.render', function(res, data){
    var a = data.headers ? data.headers.accept : undefined;
    if(a && /application\/json/.test(a)) {
      delete data.headers;
      res.renderJSON(data);
    }
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