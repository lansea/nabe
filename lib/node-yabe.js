// **node-yabe** is a git-powered, minimalist blog engine for coders.
//
// A simple (but yet another) blog engine written in node. It basically 
// takes the articles/ folder full of markdown post and serves them as a website.
//
// Posts are passed through [Markdown](http://daringfireball.net/projects/markdown/syntax), 
// and snippets of code is passed through [Prettify](http://code.google.com/p/google-code-prettify/) 
// syntax highlighting. This page is the result of running [Docco](http://jashkenas.github.com/docco/) 
// against its own source files.
//
// The [source for this blog engine](http://github.com/mklabs/node-yabe) is available on GitHub.
//
// This project respectfully uses code from and thanks the authors of:
//
// * [connect](https://github.com/senchalabs/connect)
// * [wheat](https://github.com/creationix/wheat)
// * [findit](https://github.com/substack/node-findit)
// * [github-flavored-markdown](https://github.com/isaacs/github-flavored-markdown)
// * [git-fs](https://github.com/creationix/node-git)
// * [jquery-global](https://github.com/jquery/jquery-global)
// * [jqtpl](https://github.com/kof/node-jqtpl)
// * [yaml](https://github.com/visionmedia/js-yaml)
// * [h5b-server-config for node](https://github.com/paulirish/html5-boilerplate-server-configs/blob/master/node.js)

// ## Connect server 
//
// This file comes with a basic server configuration and is based on 
// [h5b-server-config for node](https://github.com/paulirish/html5-boilerplate-server-configs/blob/master/node.js)
var mime = require('mime'),
connect = require('connect'),
path = require('path'),

// **configuration module, more on this [here](config.html)**
config = require('./config'),

// **router module, more on this [here](routes.html)**
routes = require('./routes');

// ### Mimes configuration
// Define early so that connects sees them
mime.define({
    'application/x-font-woff': ['woff'],
    'image/vnd.microsoft.icon': ['ico'],
    'image/webp': ['webp'],
    'text/cache-manifest': ['manifest'],
    'text/x-component': ['htc'],
    'application/x-chrome-extension': ['crx']
});

// ### Create and expose the server

module.exports = connect.createServer(
  // good ol'apache like logging
  // you can customize how the log looks:
  // http://senchalabs.github.com/connect/middleware-logger.html
  connect.logger(),
  
  // call to trigger routes
  connect.router(routes),

  // set to ./ to find the boilerplate files
  // change if you have an htdocs dir or similar
  // maxAge is set to one month
  connect.static(path.join(process.cwd(), config.themeDir, config.theme, 'public'), {
    
    // set you cache maximum age, in milisecconds.
    // if you don't use cache break use a smaller value
    maxAge: 1000 * 60 * 60 * 24 * 30
  })
);

// ### Error handling

// this is a failsafe, it will catch the error silently and logged it the console.
// While this works, you should really try to catch the errors with a try/catch block
// more on this [here](http://nodejs.org/docs/v0.4.7/api/process.html#event_uncaughtException_)
process.on('uncaughtException', function (err) {
   console.log('Caught exception: ' + err);
   console.error(err);
});

