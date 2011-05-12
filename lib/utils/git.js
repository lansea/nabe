var fs = require('fs'),
ChildProcess = require('child_process'),
git = module.exports = require('git-fs');

var gitENOENT = /fatal: (Path '([^']+)' does not exist in '([0-9a-f]{40})'|ambiguous argument '([^']+)': unknown revision or path not in the working tree.)/;


// helper to talk to the git subprocess, coming from git-fs (not exposed by default)
git.exec = function exec(commands, callback) {
  var child = ChildProcess.spawn("git", commands);
  var stdout = [], stderr = [];
  child.stdout.setEncoding('binary');
  child.stdout.addListener('data', function (text) {
    stdout[stdout.length] = text;
  });
  child.stderr.addListener('data', function (text) {
    stderr[stderr.length] = text;
  });
  child.addListener('exit', function (code) {
    var out = stdout.join('');
    if (code > 0 && !/nothing\sto\scommit/.test(out)) {
      return callback(new Error("git " + commands.join(" ") + "\n" + out));
    }
    callback(null, stdout.join(''));
  });
  child.stdin.end();
};


git.commit = function commit(file, message, callback) {
  console.log('Fu commit', arguments);
  
  var args = ['add', file],
  out = "",
  self = this;
  
  this.exec(args, function(err, text) {
    if(err) { return callback(err); }
    out += text;    
    self.exec(['commit', file, '-m', message], function(err, text) {
      if(err) { return callback(err); }
      out += text;
      callback(null, out);
    });
  });
};

