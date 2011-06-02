//  Provides needed interface to manipulate and retrieve blog posts
//  now done using the fs directly, will soon change to use node-git


// [findit](https://github.com/substack/node-findit) is used to provide a clean and very handy api
// to read recursively through a git repo
var findit = require('findit'),

git = require('git-fs'),
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
sortArticles = function sortArticles(options, posts) {
  posts = posts.sort(function(a, b) {
    return (Date.parse(b.date)) - (Date.parse(a.date));
  });
  
  posts.forEach(function(post) {
    post.date = util.parseDate(post.date, options.format, options.culture);
  });
  
  return posts;
},

// ### processArticles(options, files, tag, cb)
// private helper function that 
//
// * parse out the list of files
// * extract meta informations
// * parse markdown
// * and sort them by date
// 
// If the second paramters is a string, tag is assumed and only matching articles are returned.
// Otherwise, `processArticles(options, files, cb)`
//
// files are returned as an array of objects `{name, data, author, categories, markdown}`
processArticles = function processArticles(options, files, tag, cb) {
  var filecount = 0,
  ln = files.length - 1,
  abspath = [cwd, config.articleDir].join('/').replace(/\/$/, ''),
  summary = options.summary,
  delim = summary.delim ? new RegExp(summary.delim) : undefined,
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
        var props, sum;
        if (err) { return next(err); }

        // extract meta informations
        props = util.parseProps(body);
        
        // set post name, simply the filename minus its absolute path and extension
        props.name = file
          .replace(abspath + '/', '')
          .replace(new RegExp('/?' + config.articleDir + '/?'), '')
          .replace('.markdown', '');
        
        // generate markdown property, its html representation. 
        
        // summary are generated and stop on the very first `summary.delim` config occurence
        sum = delim && delim.test(props.markdown) ? props.markdown.split(delim)[0] : props.markdown;
        
        // if post content does not have a delimiter within, summary are full article.
        props.markdown = util.markdown(sum);
        
        // if we have a tag to filter on, only append files that have categories matching
        if(tag) {
          if(props.categories && props.categories.indexOf(tag) !== -1) {
            arts.push(props); 
          }
        } else {
          arts.push(props);
        }
        
        if(ln === filecount) {
          return cb(null, sortArticles(options, arts));
        }
        
        filecount++;
    });  
  });
};

var Posts = module.exports = function Posts(o) {
  var refs = Path.join(process.cwd(), ".git", "packed-refs");
  
  try {
    // Check is this is a working repo
    fs.statSync(refs);
    
    git(process.cwd());
    this.validRepo= true;

  } catch (e) {
    console.warn('not a valid repo', refs, '. No revisions for you.');
  }  
  
  // options here are the merged results of defaults `config.js` file
  // and template's `config.yml`
  this.options = o;
};

// ## Posts
// Our data source
Posts.prototype = {
  
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
    var self = this,
    
    // win: failsafe using mysys on windows platform
    // give relative path instead of absolute one.
    path = path.replace(new RegExp(cwd + '/?'), '');
    
    if(!this.validRepo) {
      fs.readFile(path, 'utf8', self.handleFile.bind(self, null, path, cb));
      return this;
    }
    
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
    
    if(!this.validRepo) {
      fs.readFile(path, 'utf8', self.handleFile.bind(self, null, path, cb));
      return this;
    }
    
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
    processArticles(this.options, files, tag, cb);
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
    props.date = util.parseDate(props.date, this.options.format, this.options.culture);
    props.revisions = {};
    
    // globalize revisions date as well
    for(var sha in logs) {
      props.revisions[sha] = {
        author: logs[sha].author,
        message: logs[sha].message,
        date: util.parseDate(logs[sha].date, this.options.format, this.options.culture)
      };
    }
    
    cb(null, props);
    
    return this;
  }
};