// This file is the main application controller; it is loaded and used by the [router](routes.html) module. 
//
// Generally, this file should be used only for defining actions and methods
// should follow the `.method(req, res, next)` pattern.
//
var fs = require('fs'),
sys = require('sys'),
yaml = require('yaml'),
findit = require('findit'),
events = require('events'),

config = require('./config'),
util = require('./util'),
posts = require('./model/posts'),

path = process.cwd();

// ## Renderer
// Main actions(controllers) go here. renderers are instance of 
// EventEmitter to provide a set of response lifecycle hooks.
var Renderer = function Renderer(o) {
  var dir = [path, o.themeDir, o.theme, ''].join('/'),
  pages = [];
  
  events.EventEmitter.call(this);
    
  // add each templates found in `themeDir/theme/templates/pages`
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
    
  // merge in `config.yml` settings,
  // since init is call on server startup sync is ok there
  this.options = util.extend({}, config, yaml.eval(fs.readFileSync(dir + 'config.yml').toString()));
};

sys.inherits(Renderer, events.EventEmitter);

// ### .index(req, res, next, cb)
// main action, called on `/`, display a list of articles sorted by most recent one
Renderer.prototype.index = function index(req, res, next, cb) {
  var abspath = [path, this.options.articleDir].join('/').replace(/\/$/, ''),
  self = this;
  
  if(cb && typeof cb === 'function') {
    // we're given a specific abspath, defaults to default behaviour
    abspath = cb;
    cb = null;
  }

  posts.all(abspath, function(err, results) {
    if(err) { return next(err); }
    self.render('index.html', res, {
      articles: results,
      headers: req.headers,
      config: self.options
    });        
  });
  
  return this;
};

// ### .category(req, res, next)
// category action, called on `category/folder/or/subfolder`
// display a list of articles sorted by most recent one, and filtered by corresponding path
Renderer.prototype.category = function category(req, res, next) {
  var abspath = [path, this.options.articleDir].join('/').replace(/\/$/, ''),
  filter = req.params.category || req.params,
  self = this;
  
  posts.categories(abspath, new RegExp('/' + filter + '/'), function(err, results) {
    if(err) { return next(err); }
    self.render('index.html', res, {
      articles: results,
      headers: req.headers,
      config: self.options
    });
  });
  
  return this;
};

// ### .tag(req, res, next)
// tag action, called on `tag/tag-name`
// display a list of articles sorted by most recent one, and filtered by corresponding tag
Renderer.prototype.tag = function tag(req, res, next) {
  var abspath = [path, this.options.articleDir].join('/').replace(/\/$/, ''),
  filter = new RegExp('/' + req.params.category + '/'),
  self = this;
  
  posts.tags(abspath, req.params.tag, function(err, results) {
    if(err) { return next(err); }
    self.render('index.html', res, {
      articles: results,
      headers: req.headers,
      config: self.options
    });
  });
  
  return this;
};

// ### .article(req, res, next)
// article action, called on `/article/article-name` or `/article/folder/or/subfolder/article-name`
// display an article content along metadata informations and git revisions.
Renderer.prototype.article = function(req, res, next) {
  var article = req.params[0],
  abspath = [path, this.options.articleDir, article].join('/').replace(/\/$/, ''),
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

      self.render('article.html', res, {
        article: results,
        author:  {name: results.author},
        headers: req.headers,
        content: results.body,
        config: self.options
      });
    });
  });
  
  return this;
};

// ### .revision(req, res, next)
// revision action, called on `e3e43764c7854f5ce4c16d527ec6244a3c2a0f7d/article-name`
// display content of article-name.markdown from git history
Renderer.prototype.revision = function(req, res, next) {
  var sha = req.params[0],
  file = req.params[1],
  self = this;
  
  posts.revision(sha, file, function(err, results) {
    if(err) { return next(err); }

    self.render('article.html', res, {
      article: results,
      author:  {name: results.author},
      headers: req.headers,
      content: results.body,
      config: self.options
    });
  });
};

//### .feed(req, res, next)
// feed action, called on `feed.xml`
// same as index but rendered using feed.xml template to provide a simple and basic rss feed
Renderer.prototype.feed = function(req, res, next){
  var abspath = [path, this.options.articleDir].join('/').replace(/\/$/, ''),
  self = this;

  posts.all(abspath, function(err, results) {
    if(err) { return next(err); }
    self.render('feed.xml', res, {articles: results, config: self.options}, true);
  });
  
  return this;
};

//### .render(target, res, data, force = false)
// convenience method. response is automatically 'sidebarized', meaning that data passed in
// will have a special sidebar/has_sidebar properties available to use 
// (if a matching _sidebar.markdown is found).
Renderer.prototype.render = util.sidebarize(function render(target, res, data, force) {
  var partial, layout;
  
  // this is where we fire the single response hook, right before templating and response end.
  this.emit('yabe.render', res, data);
  
  // if any listener have ended the response, prevent default behaviour.
  if(res.finished) {return;}
  
  // force argument when set to true prevent template from being decorated with `layout.html`
  // (useful in the case of `feed.xml`)
  partial = util.toHtml('tmpl.' + target, data);
  layout = !force ? util.toHtml('tmpl.layout.html', {config: data.config, context: data, content: partial}) : partial;
  
  // prettify snippets of code
  layout = util.prettify(layout);
  
  // with feeds, the ' escape made it non valid feed.
  layout = layout.replace(/&#39/g, "'");
  
  res.writeHead(200, {
    'Content-Type': /\.xml/.test(target) ? 'application/rss+xml' : 'text/html',
    'Content-Length': layout.length
  });
  
  res.end(layout);
});

// expose the Renderer Object via
module.exports = new Renderer(config);