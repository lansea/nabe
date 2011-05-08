var connect = require('connect'),
fs = require('fs'),
https = require('https'),
jqtpl = require('jqtpl'),
prettify = require('prettify'),
ghm = require('github-flavored-markdown'),
config = require('../config'),
routes = require('../routes'),

path = [process.cwd(), config.themeDir, config.theme, 'templates/pages/'].join('/');

module.exports = function json(o) {
  
  console.log('init github layer > ', o);
  
  var cache,
  
  listRepos = function listRepos(user, cb) {
    
    if(cache) {
      return cb(cache);
    }
    
    cb = cb || function(){};
    
    https.get({host: 'github.com', path: 'https://github.com/api/v2/json/repos/show/' + user}, function(response) {
      if(response.statusCode !== 200) return next(new Error('Invalid response for repos/show '));
        
      response.on('data', function(json) {
        var data = JSON.parse(json.toString()),
        names = {};
          
        data.repositories.forEach(function(repo, i) {
          names[repo.name] = repo;
        });
          
        cache = names;
        
        return cb(names);
      }).on('error', function(e) {
        throw e;
      });
        
    });
  };
  
  listRepos(config.github.user);
  
  return connect.router(function(app) {
    
    
    app.get('/:project', function(req, res, next) {
        var project = req.params.project,
        tmplKey = 'tmpl.github.html',
        hasTmpl = jqtpl.template[tmplKey],
        
        // fixme: add a way of merging templates config.yml file here
        // for now just config.js is available
        path = ['', config.github.user, project, 'raw/master/README.' + config.github.ext].join('/'), 
        layout, partial;
        
        
        if(!hasTmpl) { return next(); }
        
        listRepos(config.github.user, function(repos) {
          
          if(!(project in repos)) {
            throw new Error('404 :(((');
          }
          
          https.get({ host: 'github.com', path: path }, function(response) {
            if(response.statusCode !== 200) return next(new Error('unknown project ' + project));

            response.on('data', function(chunk) {
              var data = ghm.parse(chunk.toString());

              partial = jqtpl.tmpl(tmplKey, {config: config, content: data, name: project});
              layout = jqtpl.tmpl('tmpl.layout.html', {config: config, context: {content: data}, content: partial});

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

          }).on('error', function(e) {
            next(e);
          });
          
        });
    });
    
  });
};