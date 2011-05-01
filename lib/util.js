// ## util module
//  Provides needed interface for various stuff that this blog engine use

// module dependencies
var fs = require('fs'),
qs = require('querystring'),
jqtpl = require('node-jqtpl'),
prettify = require('prettify'),
ghm = require('github-flavored-markdown'),
jqg = require('jquery-global'),

// todo: provide an interface to manage path finder
path = process.cwd(),
config = require('./config'),

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

fileChange = function(file) { return function fileChange(curr, prev) {
  if(+curr.mtime !== +prev.mtime) {
    compile(file); 
  }
}};

module.exports = {
  
  // markdown helper, delegates to github-flavored-markdown module
  markdown: function toHtml() {
    return ghm.parse.apply(this, arguments);
  },

  // template helper, delegates to jqtpl
  toHtml: function() {
    return jqtpl.tmpl.apply(this, arguments);
  },
  
  // prettify helper, replace each code snippets with syntax highlighted one. 
  // delegated to prettify module
  prettify: function(str) {
    return str.replace(/<pre><code>[^<]+<\/code><\/pre>/g, function (code) {
      code = code.match(/<code>([\s\S]+)<\/code>/)[1];
      code = prettify.prettyPrintOne(code);
      return "<pre><code>" + code + "</code></pre>";
    });
  },
  
  // meta property helper, it returns an object matching properties and values defined
  // on top of each post file.
  parseProps: function parseProps(markdown) {
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
        return qs.escape(element.trim());
      });
    }
    
    return props;
  },
  
  // a simple helper to remove meta properties from post content
  extractProps: function extractProps(markdown){
    return markdown.substr(markdown.indexOf('\n\n'));
  },
  
  // date format helper, done thanks to jquery.global plugin ported to node
  parseDate: function(date, format, culture) {
    format = format || config.format;
    culture = culture || config.culture;
    
    if(culture !== 'en') {
      require('jquery-global/globinfo/Globalization.' + culture); 
    }
    
    return jqg.global.format(new Date(date), format, culture);
  },
  
  // compile given template file for later use
  addTemplate: function addTemplate(file) {
    // adding templates      
    compile(file);
    
    // also register to file changes to automatically recompile them
    fs.watchFile(file, fileChange(file));
  },
  
  // sidebar helper, retrieve a special `_sidebar.markdown` file and place it in context
  sidebarize: function sidebarize(fn) {
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
  },
  
  // Extend a given object with all the properties in passed-in object(s).
  // coming from _underscore_
  extend: function extend(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function(source){
      for (var prop in source) {
        if (source[prop] !== undefined) obj[prop] = source[prop];
      }        
    });
    
    return obj;
  },
};