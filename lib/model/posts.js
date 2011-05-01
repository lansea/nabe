// ## posts model module
//  Provides needed interface to manipulate and retrieve blog posts
//  now done using the fs directly, will soon change to use node-git

// [chainsaw](https://github.com/substack/node-chainsaw) is used to provide a chainable interface
var Chainsaw = require('chainsaw'),

// [Seq](https://github.com/substack/node-seq) is used as a flow control library
Seq = require('seq'),

// [findit](https://github.com/substack/node-findit) is used to provide a clean and very handy api
// to read recursively through a git repo
findit = require('findit'),

fs = require('fs'),

config = require('../config'),
util = require('../util'),

// private helper functions that provides sort ability
// it basically sort files objects (must have a date key) by most recents

// it then replace date property for each post with globalized value thanks to jquery.global plugin ported to node
sortArticles = function sortArticles(posts) {
  posts = posts.sort(function(a, b) {
    return (Date.parse(b.date)) - (Date.parse(a.date));
  });
  
  posts.forEach(function(post) {
    post.date = util.parseDate(post.date);
  });
  
  return posts;
},

// todo: provide an interface to manage path finder
path = process.cwd(),

// private helper function that parse out the list of files
// extract meta informations, process markdown parsing and sort them by date
// if the second paramters is a string, tag is assumed and only matching articles are returned
// otherwise, processArticles(['/path/fo/files1', ...], function(err, files) {})
// files return is an array of objects {name, data, author, categories, markdown}
processArticles = function processArticles(files, tag, cb) {
  var filecount = 0,
  ln = files.length - 1,
  abspath = [path, config.articleDir].join('/').replace(/\/$/, ''),
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

        props = util.parseProps(body);
        
        props.name = file
          .replace(abspath + '/', '')
          .replace('.markdown', '');
          
        props.markdown = util.markdown(props.markdown.substr(0, props.markdown.indexOf("##")));
        
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


// Our data source
var posts = module.exports = {
  
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
  
  // Loads an article complete with log information (logs to come soon)
  find: function find(path, cb) {
    var self = this;
    fs.readFile(path, 'utf8', function (err, body) {
      var props = {};
      if (err) { return cb(err); }
      
      props = util.parseProps(body);
      props.body = util.markdown(util.extractProps(body));
      props.date = util.parseDate(props.date);
      
      cb(null, props);
    });
    
    return this;
  },
  
  // Loads the list of tags
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
  
  // Loads the list of categories
  // takes a path to scan and filter(regex) to apply to
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
  
  // expose this helper function
  handleFiles: function handleFiles (files, tag, cb) {
    processArticles(files, tag, cb);
    return this;
  }
};