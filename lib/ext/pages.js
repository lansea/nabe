var connect = require('connect'),
fs = require('fs'),
jqtpl = require('node-jqtpl'),
prettify = require('prettify'),
config = require('../config'),
routes = require('../routes'),
mediator = require('../mediator'),

yaml = require('yaml'),

path = [process.cwd(), config.themeDir, config.theme, ''].join('/'),

extend = function extend(obj) {
  Array.prototype.slice.call(arguments, 1).forEach(function(source){
    for (var prop in source) {
      if (source[prop] !== undefined) obj[prop] = source[prop];
    }        
  });
  
  return obj;
};

module.exports = function json(o) {
  
  console.log('init pages layer > ', o);
  
  // todo better merge in
  // and dryer... a lot of code is being duplicated (syntax highlight, ...)
  fs.readFile(path + 'config.yml', function(err, body) {
    if(err) {throw err;}
    
    var data = yaml.eval(body.toString());
    
    // merge in global config with templates one
    // this is a module-scoped singleton
    config = extend({}, config, data);
  });
  
  return connect.router(function(app) {
    
    app.get('/:file', function(req, res, next) {
        var url = req.url,
        file = req.params.file,
        tmplKey = 'tmpl.page.{file}.html'.replace('{file}', file),
        hasTmpl = jqtpl.template[tmplKey],
        layout, partial;
        
        if(!hasTmpl) { return next(); }
        
        partial = jqtpl.tmpl(tmplKey, {config: config});
        layout = jqtpl.tmpl('tmpl.layout.html', {config: config, context: {}, content: partial});
        
        // prettify snippets of code
        layout = layout.replace(/<pre><code>[^<]+<\/code><\/pre>/g, function (code) {
          code = code.match(/<code>([\s\S]+)<\/code>/)[1];
          code = prettify.prettyPrintOne(code);
          return "<pre><code>" + code + "</code></pre>";
         });
        
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Length': layout.length
        });

        res.end(layout);
    });
    
  });
};