var connect = require('connect'),
fs = require('fs'),
jqtpl = require('node-jqtpl'),
prettify = require('prettify'),
config = require('../config'),
routes = require('../routes'),
mediator = require('../mediator'),

path = [process.cwd(), config.themeDir, config.theme, 'templates/pages/'].join('/');

console.log('path: ', path);

module.exports = function json(o) {
  
  console.log('init pages layer > ', o);
  
  return connect.router(function(app) {
    
    app.get('/:file', function(req, res, next) {
        var url = req.url,
        file = req.params.file,
        tmplKey = 'tmpl.{file}.html'.replace('{file}', file),
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