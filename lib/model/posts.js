//  Provides needed interface to manipulate and retrieve blog posts
//  now done using the fs directly, will soon change to use node-git


// [findit](https://github.com/substack/node-findit) is used to provide a clean and very handy api
// to read recursively through a git repo
var findit = require('findit'),

git = require('node-git'),
fs = require('fs'),
Path = require('path'),

config = require('../config'),
util = require('../util'),

cwd = process.cwd(),

// ### sortArticles(posts)
// Private helper functions that provides sort ability.
// It basically sort files objects (must have a date prop) by most recent ones.
// It then replaces date property for each post with globalized value thanks to 
// jquery.global plugin ported to node
sortArticles = function sortArticles(posts) {
  posts = posts.sort(function(a, b) {
    return (Date.parse(b.date)) - (Date.parse(a.date));
  });
  
  posts.forEach(function(post) {
    post.date = util.parseDate(post.date);
  });
  
  return posts;
},

// ### processArticles(files, tag, cb)
// private helper function that 
//
// * parse out the list of files
// * extract meta informations
// * parse markdown
// * and sort them by date
// 
// If the second paramters is a string, tag is assumed and only matching articles are returned.
// Otherwise, `processArticles(files, cb)`
//
// files are returned as an array of objects `{name, data, author, categories, markdown}`
processArticles = function processArticles(files, tag, cb) {
  var filecount = 0,
  ln = files.length - 1,
  abspath = [cwd, config.articleDir].join('/').replace(/\/$/, ''),
  arts = [];
  
  if(typeof tag == 'function' && arguments.length >= 2) {
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

        // extract meta informations
        props = util.parseProps(body);
        
        // set post name, simply the filename minus its absolute path and extension
        props.name = file
          .replace(abspath + '/', '')
          .replace('.markdown', '');
        
        // generate markdown property, its html representation. summary are generated and
        // stop on the very first `##` occurence (h2)
        props.markdown = util.markdown(props.markdown.substr(0, props.markdown.indexOf("##")));
        
        // if we have a tag to filter on, only append files that have categories matching
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

// init git repo... not the best place to do this but for now...
git(process.cwd());


// ## Posts
// Our data source
var posts = module.exports = {
  
  // ### .all(path, cb)
  // Loads all posts files
  all: function all(path, cb) {
    var files = [];

    findit.find(path)
      .on('error', function(err){
        cb(err);
      })
      .on('file', function(file, stat) {
        // Filter out non markdown files and special ones
        if (!(/\.markdown$/.test(file)) || /_sidebar\.markdown$/.test(file)) {
          return;
        }
          
        files.push(file);
      })
      .on('end', this.handleFiles.bind(this, files, cb));
    
    return this;
  },
  
  // ### .find(path, cb)
  // Loads an article complete with log information
  find: function find(path, cb) {
    var self = this;
    
    git.log(path, function(err, logs) {
      if(err) {return cb(err);}
      fs.readFile(path, 'utf8', self.handleFile.bind(self, logs, path, cb));
    });
    
    return this;
  },
  
  // ### .revision(path, cb)
  // alternately, if we have a version (sha), loads in an article
  // from git history. find and revision are almost identical, thus may 
  // become a single method.
  revision: function(version, file, cb) {
    var path = Path.join(config.articleDir, file + '.markdown'),
    self = this;
    
    git.log(path, function(err, logs) {
      if(err) {return cb(err);}  
      git.readFile(version, path, self.handleFile.bind(self, logs, path, cb));
    });
    
    return this;
  },
  
  // ### .tags(path, tag, cb)
  // Loads the list of posts that match requested tag. posts are sorted by most recent one.
  tags: function tags(path, tag, cb) {
    var files = [];

    findit.find(path)
      .on('file', function (file, stat) {
        if(!(/\.markdown$/.test(file))) {
          return;
        }
        
        files.push(file);
      })
      .on('end', this.handleFiles.bind(this, files, tag, cb));
      
    return this;
  },
  
  
  // ### .categories(path, filter, cb)
  // Loads the list of posts that match requested category. takes a path to scan 
  // and filter(regex) to apply to. posts are then sorted by most recent one.
  categories: function categories(path, filter, cb) {
    var files = [];
      
    findit.find(path)
      .on('error', function(err){
        cb(err);
      })
      .on('file', function(file, stat) {
        var match = filter.test(file) && /\.markdown/.test(file);
          
        if(!match) {
          return;
        }
          
        files.push(file);
      })
      .on('end', this.handleFiles.bind(this, files, cb));
        
    return this;
  },
  
  // ### .handleFiles(path, filter, cb)
  // expose this helper function
  handleFiles: function handleFiles (files, tag, cb) {
    processArticles(files, tag, cb);
    return this;
  },
  
  // ### .handleFile
  // convenience method. mimics `handleFiles` behaviour (meta parse, markdown, ...)
  // while setting up revisions property from git history.
  handleFile: function (logs, path, cb, err, body) {
    var props = {};
    if (err) { return cb(err); }

    props = util.parseProps(body);
    props.name = path
      .replace(cwd, '')
      .replace(new RegExp('/?' + config.articleDir + '/?'), '')
      .replace('.markdown', '');
    
    props.body = util.markdown(util.extractProps(body));
    props.date = util.parseDate(props.date);
    props.revisions = {};
    
    // globalize revisions date as well
    for(var sha in logs) {
      props.revisions[sha] = {
        author: logs[sha].author,
        message: logs[sha].message,
        date: util.parseDate(logs[sha].date)
      };
    }
    
    cb(null, props);
    
    return this;
  }
};