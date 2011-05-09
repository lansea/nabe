// This file defines a custom connect layer that takes care of admin feature. 
//
// It aims at providing you a clean and handy UI to edit and create new posts.

// **Markdown editor**
// a standalone markdown editor sitting between ace and showdown.

// **Git**
// Each time a file is saved or edited, a new git commit is performed. It uses the 
// global configuration for the current repo (so commit author will match git config)
//

var connect = require('connect'),
renderer = require('../../renderer'),
util = require('../../util'),
path = require('path');

// ## Admin layer
// A custom connect layer. It exports a function to be passed in a `use` call, generally
// prefixed with `/admin` routes. This function returns a connect.router with the following
// available
var admin = module.exports = function(o) {
  console.log('init admin layer > ', o);
  
  // templates configuration
  util.addTemplate(path.join(__dirname + '/admin.html'));
  
  
  return connect.router(function(app) {
    
    // ### `GET /`
    app.get('/', function(req, res, next) {
      renderer.render('admin.html', res, {woot: 'false', headers: req.headers});
    });
    
    // ### `GET /edit/filename`
    // Alternately, works recursively and would match `/edit/folder/or/subfolder/pathname`
    app.get(/\/edit\/(.+)\/?/, function(req, res, next) {
      var page = req.params[0];
      res.end('edit ' + page);
    });
    
    // ### `POST /edit/filename`
    app.post(/\/edit\/(.+)\/?/, function() {
      var page = req.params[0];
      res.end('post edit ' + page);
    });
    
    // ### `POST /create`
    app.post('/create', function() {
      var page = req.params.page;
      res.end('post edit ' + page);
    });
    
    app.get('*', function(err, res, next) {
      next(new Error('404'));
    });
  });
};

// ### .authenticate(user, pass)
// simple credential assert against config
admin.authenticate = function authenticate(user, pass) {
  var o = renderer.options.admin;
  return o.user === user && o.pass === pass;
};