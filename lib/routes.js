// This file is the main router; it is loaded by the main application bootstrap file. 
//
// Generally, this file should be used only for defining routes.
//
// Actual functionality should be placed in other files that export 
// actions to trigger on routes defined here.

var config = require('./config'),

//**renderer module, more on this [here](renderer.html)**
renderer = require('./renderer'),

// this is failsafe, designed to be triggered when an undefined renderer is passed in `addRoute`.
// Also useful to see routes triggered and parameters available.
defaultHandler = function defaultHandler(route) {
    return function(req, res, next) {
        console.log('Matching route ', route, ' for ', req.url);
        console.log('params: ', req.params);
        next();
    };
},

// internal helper to force context on controllers' actions.
proxy = function proxy(fn, context) {
    return function proxy(req, res, next) {
        return fn.apply(context, arguments);
    };
};

// ## Router

// Using [connect.router](http://senchalabs.github.com/connect/middleware-router.html)
// > Provides Sinatra and Express-like routing capabilities.

// this file creates and expose the router layer to pass in the connect server.
var router = module.exports = function router(app) {
    
    // Internal helper that set up a new `GET` routes 
    var addRoute = function(route, r) {
        r = r || defaultHandler(route);
        app.get(route, proxy(r, renderer));
    };

    // ### index
    // triggered on `/`, this is the main action. It displays a list of posts
    // sorted by most recent ones.
    addRoute('/', renderer.index);

    // ### feed.xml
    // triggered on `/feed.xml`. It displays a list of posts
    // sorted by most recent ones and rendered using `feed.xml` template
    // to provide a basic rss feed.
    addRoute('/feed.xml', renderer.feed);

    // ### tag
    // triggered on `/tag/tag-name`. It displays a list of posts
    // sorted by most recent ones and filtered depending on the requested
    // tag (tags are defined on top of each article files using `Categories` property).
    addRoute('/tag/:tag', renderer.tag);
    
    // ### category
    // triggered on `/category/category-name`. It displays a list of posts
    // sorted by most recent ones and filtered depending on the requested category.
    // The list of articles in `/folder/subfolder/` can be accessed with 
    // `/category/folder/subfolder/`
    // folders in articles one can be seen as a way of providing simple hierarchical categories.
    addRoute('/category/:category', renderer.category);
    
    // ### revision
    // revision action, called on `e3e43764c7854f5ce4c16d527ec6244a3c2a0f7d/article-name`
    // display content of article-name.markdown from git history. It basically
    // enables server to read files out of a git repository as if they were local files.
    // This is possible thanks to [node-git](https://github.com/creationix/node-git/), a thin
    // wrapper around the command-line `git` command for use inside node applications.
    addRoute(/\/([a-f0-9]{40})\/(.+)\/?/, renderer.revision);

    // ### article
    // article action, called on `/article/article-name` or `/article/folder/or/subfolder/article-name`
    // display an article content along meta-data informations and git revisions.
    addRoute(/\/article\/(.+)\/?/, renderer.article);
    
    // ### `article/`
    // this is failsafe, displays exactly the same thing than index route.
    addRoute('/article', renderer.index);
    
    // ### Addition to the static provider
    // this must be the last route, it's coming directly from
    // [h5b-server-config for node](https://github.com/paulirish/html5-boilerplate-server-configs/blob/master/node.js)
    app.get('*', function(req, res, next) {
        var reqPath = req.url,
        userAgent = req.headers['user-agent'],
        reqHost = req.headers.host;
        
        if (userAgent && userAgent.indexOf('MSIE') && reqPath.match(/\.html$/) || reqPath.match(/\.htm$/)) {
          // use this header for html files, or add it as a meta tag
          // to save header bytes serve it only to IE
          res.setHeader('X-UA-Compatible', "IE=Edge,chrome=1"); 
        }

        // protect .files
        if (reqPath.match(/(^|\/)\./)) {
          return res.end("Not allowed"); 
        }

        // allow cross domain (for your subdomains)
        // disallow other domains.
        // you can get really specific by adding the file
        // type extensions you want to allow to the if statement
        if (reqHost && !reqHost.match(config.hostAddress)) {
          return res.end("Cross-domain is not allowed"); 
        }

        next();
        // let the static server do the rest
    });
};