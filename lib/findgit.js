var Git = require('git-fs'),
Path = require('path'),
events = require('events');

exports.find = function findgit(abspath, callback) {
  var files = [], dirs = [], count = 0,
  em = new events.EventEmitter;
    
  (function recurse(p, f) {
    
    Git.readDir('fs', p, function(err, results) {
      if(err) {
        return callback ? callback(err, []) : em.emit('error', err, []);
      }
      
      var d = results.dirs
      .filter(function(q) { return q !== '.git'; })
      .map(function(a) {
        var dir = Path.join(p, a);
        em.emit('directory', dir);
        return dir;
      }),
      f = results.files.map(function(a) {
        var file = Path.join(p, a);
        em.emit('file', file);
        return file;
      });   
      
      files = files.concat(f);
      dirs = dirs.concat(d);
      
      // if we have dirs, recurse
      d.forEach(recurse);

      // incr count so that we know where we are
      count++;
      
      // if no dir to work with, return callback
      // also make sure we're done with all dirs
      if(!d.length && (dirs.length + 1) === count) {
        return callback ? callback(null, {files: files, dirs: dirs}) :
          em.emit('end', {files: files, dirs: dirs});
      }
    });
  })(abspath);
  
  return em;
};