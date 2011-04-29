var qs = require('querystring'),
jqtpl = require('node-jqtpl'),
fs = require('fs'),

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
  
  addTemplate: function addTemplate(file) {
    // adding templates      
    compile(file);
    
    // also register to file changes to automatically recompile them
    fs.watchFile(file, fileChange(file));
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