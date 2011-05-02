// ## Renderer file
//  Main actions(controller) go here
var fs = require('fs'),
yaml = require('yaml'),
findit = require('findit'),
res = require('http').ServerResponse.prototype,

mediator = require('./mediator'),
config = require('./config'),
util = require('./util'),
posts = require('./model/posts'),

path = process.cwd();

/**
* Define a custom render method on ServerResponse.
*
* Usage:
*  res.render(view, data, force = false)
*/
Object.defineProperty(res, 'render', {
  value: util.sidebarize(function(target, data, force) {
    var partial, layout;
    
    data.config = config;
    mediator.emit('yabe.render', this, data);
    
    if(this.finished) {return;}
    
    partial = util.toHtml('tmpl.' + target, data);
    layout = !force ? util.toHtml('tmpl.layout.html', {config: config, context: data, content: partial}) : partial;
  
    // prettify snippets of code
    layout = util.prettify(layout);
  
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
var Renderer = {
  
  // this method is called on server startup, therefore does not follow the regular function(req, res, next) sheme
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
  
  // main action, called on `/`, display a list of articles sorted by most recents one
  index: function(req, res, next, cb) {
    var abspath = [path, config.articleDir].join('/').replace(/\/$/, '');
      
    if(cb && typeof cb === 'function') {
      // we're given a specific abspath, defaults to default behaviour
      abspath = cb;
      cb = null;
    }

    posts.all(abspath, function(err, results) {
      if(err) { return next(err); }
      res.render('index.html', {
        articles: results,
        headers: req.headers
      });        
    });
    
    return this;
  },
  
  // category action, called on `category/folder/or/subfolder`
  // display a list of articles sorted by most recents one, and filtered by corresponding path
  category: function(req, res, next) {
    var abspath = [path, config.articleDir].join('/').replace(/\/$/, ''),
    filter = req.params.category || req.params;
    
    posts.categories(abspath, new RegExp('/' + filter + '/'), function(err, results) {
      if(err) { return next(err); }
      res.render('index.html', {
        articles: results,
        headers: req.headers
      });
    });
    
    return this;
  },
  
  // category action, called on `tag/tag-name`
  // display a list of articles sorted by most recents one, and filtered by corresponding tag
  tag: function(req, res, next) {
    var abspath = [path, config.articleDir].join('/').replace(/\/$/, ''),
    filter = new RegExp('/' + req.params.category + '/');
    
    posts.tags(abspath, req.params.tag, function(err, results) {
      if(err) { return next(err); }
      res.render('index.html', {
        articles: results,
        headers: req.headers
      });
    });
    
    return this;
  },
  
  // article action, called on `article/article-name`
  // display articles along its meta information (name, date, ...)
  // requests works recursively, meaning that an articles can be embbed in any level of folders/subfolders
  article: function(req, res, next) {
    var article = req.params[0],
    abspath = [path, config.articleDir, article].join('/').replace(/\/$/, ''),
    mkdpath = abspath + '.markdown',
    self = this;

    // if it's a valid dir, serves its files
    fs.stat(mkdpath, function(err, stat) {
      if(err) { 
        // before returning error, try to redirect on category 
        // users had most likely hit something like `articles/path/` instead of `articles/path/post-name`
        return self.category(req, res, next);
      }
      if(stat.isDirectory()) {return self.index(req, res, next, abspath);}
      
      // otherwise, proceed normally
      posts.find(abspath + '.markdown', function(err, results){
        if(err) { return next(err); }

        res.render('article.html', {
          article: results,
          author:  {name: results.author},
          headers: req.headers,
          content: results.body
        });
      });
    });
    
    return this;
  },
  
  revision: function(req, res, next) {
    var sha = req.params[0],
    file = req.params[1];

    
    posts.revision(sha, file, function(err, results) {
      if(err) { return next(err); }

      res.render('article.html', {
        article: results,
        author:  {name: results.author},
        headers: req.headers,
        content: results.body
      });
    });
  },
  
  // feed action, returns index results rendered by rss xml template
  feed: function(req, res, next){
    
    var abspath = [path, config.articleDir].join('/').replace(/\/$/, '');

    posts.all(abspath, function(err, results) {
      if(err) { return next(err); }
      res.render('feed.xml', {articles: results}, true);
    });
    
    return this;
  }
};


// expose the Renderer Object via
module.exports = function rendererFactory(o) {
  return Object.create(Renderer).init(o);
};