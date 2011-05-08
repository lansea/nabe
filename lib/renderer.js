// This file is the main application controller; it is loaded and used by the [router](routes.html) module. 
//
// Generally, this file should be used only for defining actions and methods
// should follow the `.method(req, res, next)` pattern.
//
var fs = require('fs'),
Path = require('path'),
sys = require('sys'),
yaml = require('yaml'),
findit = require('findit'),
events = require('events'),

config = require('./config'),
util = require('./util'),

Posts = require('./model/posts'),

cwd = process.cwd();

// ## Renderer
// Main actions(controllers) go here. renderers are instance of 
// EventEmitter to provide a set of response lifecycle hooks.
var Renderer = function Renderer(o) {
  var dir, pages = [];
  
  events.EventEmitter.call(this);
  
  // merge in `config.yml` settings, since init is call on server startup sync is ok there
  this.options = util.extend({}, o, 
    yaml.eval(fs.readFileSync(Path.join(cwd, 'config.yml')).toString()
  ));

  dir = Path.join(cwd, this.options.themeDir, this.options.theme);
    
  // add each templates found in `themeDir/theme/templates`
  findit.find(Path.join(dir, 'templates'))
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
  
  // init Posts model with mixin options
  this.posts = new Posts(this.options);
};

// inherits from [`events.EventEmitter`](http://nodejs.org/docs/v0.4.7/api/events.html)
sys.inherits(Renderer, events.EventEmitter);

// ### .index(req, res, next, cb)
// main action, called on `/`, display a list of articles sorted by most recent one
Renderer.prototype.index = function index(req, res, next, cb) {
  var abspath = Path.join(cwd, this.options.articleDir).replace(/\/$/, ''),
  self = this;
  
  if(cb && typeof cb === 'function') {
    // we're given a specific abspath, defaults to default behaviour
    abspath = cb;
    cb = null;
  }

  this.posts.all(abspath, function(err, results) {
    if(err) { return next(err); }
    self.render('index.html', res, {
      articles: results,
      headers: req.headers
    });        
  });
  
  return this;
};

// ### .category(req, res, next)
// category action, called on `category/folder/or/subfolder`
// display a list of articles sorted by most recent one, and filtered by corresponding path
Renderer.prototype.category = function category(req, res, next) {
  var abspath = Path.join(cwd, this.options.articleDir).replace(/\/$/, ''),
  filter = req.params.category || req.params,
  r = new RegExp('/' + filter + (/\/$/.test(filter) ? '' : '/')),
  self = this;
  
  this.posts.categories(abspath, r, function(err, results) {
    if(err) { return next(err); }
    self.render('index.html', res, {
      articles: results,
      headers: req.headers
    });
  });
  
  return this;
};

// ### .tag(req, res, next)
// tag action, called on `tag/tag-name`
// display a list of articles sorted by most recent one, and filtered by corresponding tag
Renderer.prototype.tag = function tag(req, res, next) {
  var abspath = Path.join(cwd, this.options.articleDir).replace(/\/$/, ''),
  filter = new RegExp('/' + req.params.category + '/'),
  self = this;
  
  this.posts.tags(abspath, req.params.tag, function(err, results) {
    if(err) { return next(err); }
    self.render('index.html', res, {
      articles: results,
      headers: req.headers
    });
  });
  
  return this;
};

// ### .article(req, res, next)
// article action, called on `/article/article-name` or `/article/folder/or/subfolder/article-name`
// display an article content along metadata informations and git revisions.
Renderer.prototype.article = function(req, res, next) {
  var article = req.params[0],
  abspath = Path.join(cwd, this.options.articleDir, article).replace(/\/$/, ''),
  mkdpath = abspath + '.markdown',
  self = this;
  
  this.posts.find(abspath + '.markdown', function(err, results){
    if(err) { return next(err); }
    self.render('article.html', res, {
      article: results,
      author:  {name: results.author},
      headers: req.headers,
      content: results.body
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
  
  this.posts.revision(sha, file, function(err, results) {
    if(err) { return next(err); }

    self.render('article.html', res, {
      article: results,
      author:  {name: results.author},
      headers: req.headers,
      content: results.body
    });
  });
};

//### .feed(req, res, next)
// feed action, called on `feed.xml`
// same as index but rendered using feed.xml template to provide a simple and basic rss feed
Renderer.prototype.feed = function(req, res, next){
  var abspath = Path.join(path, this.options.articleDir).replace(/\/$/, ''),
  self = this;

  this.posts.all(abspath, function(err, results) {
    if(err) { return next(err); }
    self.render('feed.xml', res, {articles: results}, true);
  });
  
  return this;
};

//### .render(target, res, data, force = false)
// convenience method. response is automatically 'sidebarized', meaning that data passed in
// will have a special sidebar/has_sidebar properties available to use 
// (if a matching _sidebar.markdown is found).
Renderer.prototype.render = util.sidebarize(function render(target, res, data, force) {
  var partial, layout, buffer;
  
  // set up config hash in data passed in
  data.config = this.options;
  
  // this is where we fire the single response hook, right before templating and response end.
  this.emit('nabe.render', res, data);
  
  // if any listener have ended the response, prevent default behaviour.
  if(res.finished) {return;}
  
  // force argument when set to true prevent template from being decorated with `layout.html`
  // (useful in the case of `feed.xml`)
  partial = util.toHtml('tmpl.' + target, data);
  layout = !force ? util.toHtml('tmpl.layout.html', {context: data, content: partial}) : partial;
  
  // prettify snippets of code
  layout = util.prettify(layout);
  
  // with feeds, the ' escape made it non valid feed.
  layout = layout.replace(/&#39/g, "'");
  
  buffer = new Buffer(Buffer.byteLength(layout));
  buffer.write(layout, 'utf8');
  
  res.writeHead(200, {
    'Content-Type': /\.xml/.test(target) ? 'application/rss+xml' : 'text/html',
    'Content-Length': buffer.length
  });
  
  res.end(buffer);
});

// expose the Renderer Object via
module.exports = new Renderer(config);