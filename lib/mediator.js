var util = require('util'),
EventEmitter = require('events').EventEmitter;

var Mediator = function Mediator() {
  EventEmitter.call(this);  
};

util.inherits(Mediator, EventEmitter);

(function(){
  
  this.foo = function(){console.log('foo');};
  
}).call(Mediator);

module.exports = new Mediator();