// TODO: DRY-out this file
var fs = require('fs'),
jqtpl = require('node-jqtpl'),
ghm = require('github-flavored-markdown'),
prettify = require('prettify'),
QueryString = require('querystring'),
inspect = require('util').inspect,
res = require('http').ServerResponse.prototype,
path = process.cwd(),
yaml = require('yaml'),
findit = require('findit'),

mediator = require('./mediator'),
config = require('./config'),

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
    if(this.finished) {return;}
    
    this.writeHead(200, {
        'Content-Type': /\.xml/.test(target) ? 'application/rss+xml' : 'text/html',
        'Content-Length': layout.length
    });
  
    this.end(layout);
  })
});

/**
* Renderer Object. Actions goes there, declared in the public API.
*/
var Renderer = (function Renderer() {
    
    // these functions should really go in a util file or something
    var parseProps = function parseProps(markdown) {
      var props = {},
      match = [];

      // Parse out headers
      while( (match = markdown.match(/^([a-z]+):\s*(.*)\s*\n/i)) ) {
        var name = match[1].toLowerCase(),
            value = match[2];
            
        markdown = markdown.substr(match[0].length);
        props[name] = value;
      }
      
      props.markdown = markdown;

      if(props.categories !== undefined) {
        props.categories = props.categories.split(',').map(function(element){ 
          return QueryString.escape(element.trim());
        });
      }
      
      return props;
    },
    
    compile = function compile(file) {
      fs.readFile(file, 'utf8', function(err, tmpl) {
        if (err) throw err;
        
        file = 'tmpl.' + ( /\/pages\//.test(file) ? 'page.' : '' ) + file.split('/').reverse()[0];
      
        if(jqtpl.template[file]) {
          delete jqtpl.template[file]; 
        }
        
        jqtpl.template(file, tmpl);
      }); 
    },
    
    addTemplate = function addTemplate(file) {    
      // adding templates      
      compile(file);
      
      // also register to file changes to automatically recompile them
      fs.watchFile(file, function(curr, prev) {
        if(+curr.mtime !== +prev.mtime) {
          compile(file); 
        }
      });
    },
    
    readDir = function readDir(start, callback) {      
      var finder = findit.find(start),
      found = {dirs: [], files: []};

      finder
        .on('directory', function (dir, stat) {
          found.dirs.push(dir);
        })
        .on('file', function (file, stat) {
          found.files.push(file);
        })
        .on('end', function () {
            callback(null, found);
        });
    },
    
    // Extend a given object with all the properties in passed-in object(s).
    // coming from _underscore_
    extend = function extend(obj) {
      Array.prototype.slice.call(arguments, 1).forEach(function(source){
        for (var prop in source) {
          if (source[prop] !== undefined) obj[prop] = source[prop];
        }        
      });
      
      return obj;
    },
    
    render = function render(req, res, articles) {
      articles.sort(function(a, b) {
        return (Date.parse(b.date)) - (Date.parse(a.date));
      });
      
      res.render('index.html', {
        articles: articles,
        headers: req.headers
      });
    },
    
    renderArticles = function renderArticles(req, res, files, tag) {
      var filecount = 0,
      ln = files.length - 1,
      abspath = [path, config.articleDir].join('/').replace(/\/$/, ''),
      arts = [];
      
      if(!files.length) {
        render(req, res, arts);
      }
      
      files.forEach(function(file, i) {
        
        if(!file.match(/\.markdown/)) {
          return;
        }
        
        fs.readFile(file, 'utf8', function (err, body) {
            var props;
            if (err) { return next(err); }

            props = parseProps(body);
            
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
              render(req, res, arts);
            }
            
            filecount++;
        });  
      });
       
    };
    
    
    return {
      
        options: {},
        
        init: function(o) {
          var self = this,
          dir = [path, o.themeDir, o.theme, ''].join('/');
          
          // add each templates found in themeDir/theme/templates/pages
          readDir(dir + 'templates', function(err, results) {
            results.files.forEach(function(file) {
              addTemplate.call(self, file);
            });
          });
          
          // merge in config.yml settings
          fs.readFile(dir + 'config.yml', function(err, body) {
            if(err) {return;}
            
            var data = yaml.eval(body.toString());
            
            // merge in global config with templates one
            // this is a module-scoped singleton
            config = self.options = extend({}, config, data);
          });
          
          return this;
        },
        
        index: function(req, res, next, cb) {
          
          var cat = req.params.category,
          abspath = [path, this.options.articleDir].join('/').replace(/\/$/, ''),
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
              renderArticles(req, res, files);
            });
        },
        
        category: function(req, res, next) {
          var cat = req.params.category,
          abspath = [path, this.options.articleDir].join('/').replace(/\/$/, ''),
          finder = findit.find(abspath),
          files = [];
          
          finder
            .on('file', function(file, stat) {
              if(file.match(new RegExp('/' + cat + '/'))) {
                files.push(file);
              }
            })
            .on('end', function() {
              renderArticles(req, res, files);
            });
          
        },
        
        tag: function(req, res, next) {
          var tag = req.params.tag,
          abspath = [path, this.options.articleDir].join('/').replace(/\/$/, ''),
          finder = findit.find(abspath);
          files = [];

          finder
            .on('file', function (file, stat) {
              files.push(file);
            })
            .on('end', function() {
              renderArticles(req, res, files, tag);
            });
        },
        
        article: function(req, res, next) {
            var article = req.params[0],
            abspath = [path, this.options.articleDir, article].join('/').replace(/\/$/, ''),
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
                
                props = parseProps(body);
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
            return this.index(req, res, next, function(articles) {
                res.render('feed.xml', {articles: articles}, true);
            });
        }
    };
})();


// expose the Renderer Object via
module.exports = function rendererFactory(o) {
  return Object.create(Renderer).init(o);
};