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
    
    // https://gist.github.com/825583/
    readDir = function readDir(start, callback) {
      
      // Use lstat to resolve symlink if we are passed a symlink
      fs.lstat(start, function(err, stat) {
        if(err) return callback(err);
            
        var found = {dirs: [], files: []},
        total = 0,
        processed = 0,
        isDir = function isDir(abspath) {
          fs.stat(abspath, function(err, stat) {
            if(stat.isDirectory()) {
              found.dirs.push(abspath);
              // If we found a directory, recurse!
              readDir(abspath, function(err, data) {
                found.dirs = found.dirs.concat(data.dirs);
                found.files = found.files.concat(data.files);
                if(++processed == total) {
                  callback(null, found);
                }
              });
            } else {
              found.files.push(abspath);
              if(++processed == total) {
                callback(null, found);
              }
            }
          });
        };

        // Read through all the files in this directory
        if(stat.isDirectory()) {
          fs.readdir(start, function (err, files) {
            total = files.length;
            files.forEach(function(file, i){
              isDir([start, file].join('/'));              
            });
          });
        } else {
          return callback(new Error("path: " + start + " is not a directory"));
        }
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
        
          var render = function render(articles) {
            articles.sort(function(a, b) {
              return (Date.parse(b.date)) - (Date.parse(a.date));
            });
            
            if(cb) {
              return cb(articles);
            }
            
            res.render('index.html', {
              articles: articles,
              headers: req.headers
            });
          },
          
          abspath = [path, this.options.articleDir].join('/');
          
          if(cb && typeof cb === 'string') {
            // we're given a specific abspath, defaults to default behaviour
            abspath = cb;
            cb = null;
          }
          
          
          readDir(abspath, function(err, results) {
            
            var files = [],
            articles = [],
            ln, fileCount = 0;
            
            if(err || !results || !results.files) {
              return next(err);
            }
            
          
            // Filter out non markdown files and special ones
            results.files.forEach(function(filename, i) {
              if (!(/\.markdown$/.test(filename)) || /_sidebar\.markdown$/.test(filename)) {
                return;
              }
              
              files.push(filename);
            });
            

            ln = files.length - 1;
            
            // Then handle each files
            files.forEach(function(filename, i) {
              fs.readFile(filename, function(err, markdown) {
                var props;
                
                if (err) throw err;

                if (typeof markdown !== 'string') {
                  markdown = markdown.toString();
                }

                props = parseProps(markdown);
                props.name = filename
                  .replace([path, config.articleDir, ''].join('/'), '')
                  .replace('.markdown', '');
                  
                props.markdown = ghm.parse(props.markdown.substr(0, props.markdown.indexOf("##")));
            
                articles.push(props);
                
                if(fileCount === ln) {
                  render(articles);
                }
                
                fileCount++;
              });
            });
          });
          
          
          return;
        },
        
        category: function(req, res, next) {},
        
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