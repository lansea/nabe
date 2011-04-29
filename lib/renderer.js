// TODO: DRY-out this file
var fs = require('fs'),
jqtpl = require('node-jqtpl'),
ghm = require('github-flavored-markdown'),
prettify = require('prettify'),
inspect = require('util').inspect,
res = require('http').ServerResponse.prototype,
path = process.cwd(),
yaml = require('yaml'),
findit = require('findit'),

mediator = require('./mediator'),
config = require('./config'),
util = require('./util'),

sidebarize = function sidebarize(fn) {
  var cache;
  
  return function(target, data, force) {
    var self = this, args = arguments;
    
    if(cache) {
      data.sidebar = cache;
      data.has_sidebar = true;
      return fn.apply(this, arguments); 
    }
    
    // lookup for a special _sidebar.markdown file
    fs.readFile([path, config.articleDir, '_sidebar.markdown'].join('/'), 'utf8', function (err, body) {
        if (!err) {
          data.sidebar = cache = ghm.parse(body);
          data.has_sidebar = true;
        }
        
        // whatever we've got (err), trigger callback
        fn.apply(self, args); 
    });
  };
};

/**
* Define a custom render method on ServerResponse.
*
* Usage:
*  res.render(view, data, force = false)
*/
Object.defineProperty(res, 'render', {
  value: sidebarize(function(target, data, force) {
    var partial, layout;
    
    data.config = config;
    mediator.emit('yabe.render', this, data);
    
    if(this.finished) {return;}
    
    partial = jqtpl.tmpl('tmpl.' + target, data);
    layout = !force ? jqtpl.tmpl('tmpl.layout.html', {config: config, context: data, content: partial}) : partial;
  
    // prettify snippets of code
    layout = layout.replace(/<pre><code>[^<]+<\/code><\/pre>/g, function (code) {
      code = code.match(/<code>([\s\S]+)<\/code>/)[1];
      code = prettify.prettyPrintOne(code);
      return "<pre><code>" + code + "</code></pre>";
    });
  
    // with feeds, the ' escape made it non valid feed.
    layout = layout.replace(/&#39/g, "'");
    
    this.writeHead(200, {
        'Content-Type': /\.xml/.test(target) ? 'application/rss+xml' : 'text/html',
        'Content-Length': layout.length
    });
  
    this.end(layout);
  })
});

/**
* Renderer Object. Actions go here.
*/
var Renderer = (function Renderer() {
    
    var sortArticles = function sortArticles(articles) {
      return articles.sort(function(a, b) {
        return (Date.parse(b.date)) - (Date.parse(a.date));
      });
    },
        
    renderArticles = function renderArticles(files, tag, cb) {
      var filecount = 0,
      ln = files.length - 1,
      abspath = [path, config.articleDir].join('/').replace(/\/$/, ''),
      arts = [];
      
      if(typeof tag == 'function' && arguments.length == 2) {
        cb = tag;
        tag = null;
      }
      
      if(!files.length) {
        return cb(new Error('no files'));
      }
        
      files.forEach(function(file) {
        fs.readFile(file, 'utf8', function (err, body) {
            var props;
            if (err) { return next(err); }

            props = util.parseProps(body);
            
            props.name = file
              .replace(abspath + '/', '')
              .replace('.markdown', '');
              
            props.markdown = ghm.parse(props.markdown.substr(0, props.markdown.indexOf("##")));
            
            if(tag) {
              if(props.categories && props.categories.indexOf(tag) !== -1) {
                arts.push(props); 
              }
            } else {
              arts.push(props);
            }
            
            if(ln === filecount) {
              return cb(null, sortArticles(arts));
            }
            
            filecount++;
        });  
      });
       
    };
    
    
    return {
      
        init: function(o) {
          var dir = [path, o.themeDir, o.theme, ''].join('/'),
          pages = [];
          
          // add each templates found in themeDir/theme/templates/pages
          findit.find(dir + 'templates')
            .on('file', function (file, stat) {
              if( !(/\.html|\.xml/.test(file)) ) {
                return;
              }
              
              pages.push(file);
            })
            .on('end', function end() {
              pages.forEach(function(page) {
                util.addTemplate(page);
              });
            });
          
          // merge in config.yml settings
          // since init is call on server startup sync is ok there
          config = util.extend({}, config, yaml.eval(fs.readFileSync(dir + 'config.yml').toString()));
          
          return this;
        },
        
        index: function(req, res, next, cb) {
          var cat = req.params.category,
          abspath = [path, config.articleDir].join('/').replace(/\/$/, ''),
          files = [];
          
          if(cb && typeof cb === 'string') {
            // we're given a specific abspath, defaults to default behaviour
            abspath = cb;
            cb = null;
          }
          
          findit.find(abspath)
            .on('file', function(file, stat) {
              // Filter out non markdown files and special ones
              if (!(/\.markdown$/.test(file)) || /_sidebar\.markdown$/.test(file)) {
                return;
              }
                
              files.push(file);
            })
            .on('end', function() {
              files = sortArticles(files);
              
              renderArticles(files, function(err, articles){ 
                
                if(cb) {
                  return cb(null, articles);
                }
                
                res.render('index.html', {
                  articles: articles,
                  headers: req.headers
                });
              });
            });
        },
        
        category: function(req, res, next) {
          var cat = req.params.category,
          abspath = [path, config.articleDir].join('/').replace(/\/$/, ''),
          filter = new RegExp('/' + cat + '/'),
          finder = findit.find(abspath),
          files = [];
          
          finder
            .on('file', function(file, stat) {
              var match = filter.test(file) && /\.markdown/.test(file);
              
              if(!match) {
                return;
              }
              
              files.push(file);
            })
            .on('end', function() {
              renderArticles(files, function(err, articles) {
                res.render('index.html', {
                  articles: articles,
                  headers: req.headers
                });
              });
            });
          
        },
        
        tag: function(req, res, next) {
          var tag = req.params.tag,
          abspath = [path, config.articleDir].join('/').replace(/\/$/, ''),
          finder = findit.find(abspath);
          files = [];

          finder
            .on('file', function (file, stat) {
              if(!(/\.markdown/.test(file))) {
                return;
              }
              
              files.push(file);
            })
            .on('end', function() {
              renderArticles(files, tag, function(err, articles) {
                res.render('index.html', {
                  articles: articles,
                  headers: req.headers
                });
              });
            });
        },
        
        article: function(req, res, next) {
            var article = req.params[0],
            abspath = [path, config.articleDir, article].join('/').replace(/\/$/, ''),
            self = this;
            
            fs.readFile(abspath + '.markdown', 'utf8', function (err, body) {
                var props;
                if (err) {
                  // if it's a valid dir, serves its files
                  return fs.stat(abspath, function(err, stat) {
                    if(err || !stat.isDirectory()) return next(err);
                    self.index(req, res, next, abspath);
                  });
                }
                
                props = util.parseProps(body);
                props.name = article;
                res.render('article.html', {
                  article: props,
                  author: {name: props.author},
                  headers: req.headers,
                  content: ghm.parse(body)
                });
            });
        },
        
        feed: function(req, res, next){
            return this.index(req, res, next, function(err, articles) {
              res.render('feed.xml', {articles: articles}, true);
            });
        }
    };
})();


// expose the Renderer Object via
module.exports = function rendererFactory(o) {
  return Object.create(Renderer).init(o);
};