## node-yabe

node-yabe is a git-powered, minimalist blog engine for coders.

## introduction

A simple (but yet another) blog engine written in node.js. It basically takes the `articles/` folder full of markdown post and serves them as a website.

h5b [node.js](https://github.com/paulirish/html5-boilerplate-server-configs/blob/master/node.js)(thanks [xonecas](https://github.com/xonecas)!) server configuration is used.

Yabe mainly due to my lack of inspiration when it comes to chose a name. I chose to create yet another blog engine. It is a reference to this [play](http://www.playframework.org/documentation/1.0.1/guide1#aTheprojecta) framework sample project.

Right now, this application does the barely minimum, and uses the node filesystem API to get articles content. This is a work in progress (and mostly just fun).

## blog in 10 s

    git clone git://github.com/mklabs/node-yabe.git
    cd node-yabe
    node server.js

## features

* Posts (...)
* Categories
* Markdown (via github-flavored-markdown)
* code syntax highlighting (via prettify)
* rss feed
* Comments via Disqus
* simple route => page system
* github project page (generated remotely from readmes)
* rather comprehensive json api (mostly just GETs but still)

## how it works

* content is entirely managed through git; you get full fledged version control for free.
* articles are stored as .markdown files, with embedded metadata (in yaml format)
* articles are processed through github-flavored markdown converter thus providing you some useful hooks like mklabs/node-yabe#1 or mklabs/node-yabe@da9eee105bd4becb8dd2973bf660509b30ee2be2
* templating is done through node-jqtpl
* yabe is built right on top of Connect. It takes advantage of HTTP caching and uses html5-boilerplate server config startup file (thx xonecas!)
* built with services like nodester or amazon ec2 in mind.
* comments are handled by disqus
* individual articles can be accessed through urls such as `/folder/subfolder/blogging-with-yabe` (thus folders can be seen as a way of providing simple hierarchical categories)
* relatedly, the list of articles in `/folder/subfolder/` can be accessed with the exact same url
* arbitrary metadata can be included in articles files, and accessed from the templates
* summaries are generated intelligently by yabe, following the `max` and `delimiter` settings you give it

## startr

Startr is yabe's default template, you can find it in `templates/startr`. It comes with a very minimalist but functional template, and a config.yml file to get you started.

The blog can have multiple templates name folder (inside `templates/` and refered as themes), it uses on startup configuration the configuration setting provided to lookup in the correct path.

## overview

You would start by installing _node-yabe_, with `git clone`, or then forking or
cloning the `node-yabe` repo, to get a basic skeleton (_it may change to templates (+articles) defined in their own repo, node-yabe then used with npm and a bootstrap server.js file_):

    $ git clone git://github.com/mklabs/node-yabe.git weblog
    $ cd weblog/

You would then edit the template at will, it has the following structure:

    templates/
      |
      +- startr/                    # template main folder (defined in config.yml)
        |
        +- layout.html              # the main site layout, shared by all pages
        |
        +- feed.xml                 # the basic template for the rss feed
        |
        +- pages/                   # pages, such as home, about, etc go here
           |
           +- index.html            # the default page loaded from `/`, it displays the list of articles
           |
           +- 404.html              # the default page loaded from `/non/existing/resource/`, an hopefully meaningful 404 page
           |
           +- article.html          # the article (post) partial and page
           |
           +- github.project.html   # page loaded for `/projectname`, it displays the classic README file and general information
           |
           +- about.html
      +- yourtheme/                 # another template main folder

       
### articles


You could then create a .markdown article file in the `articles/` folder, and make sure it has the following format:

    Title: What a node weekend !
    Author: John Doe
    Date: Apr 24 2011 17:08:00 GMT+0200 (CDT)

    There's no `sleep()` in JavaScript.. Nor does it have goto, Duh.

If you're familiar with wheat or toto, this should looks familiar. Basically the top of the file is in YAML format, and the rest of it is the blog post. They are delimited by an empty line `/\n\n/`, as you can see above. 

None of the information is mandatory, but it's strongly encouraged you specify it. Arbitrary metadata can be included in articles files, and accessed from the templates.

Articles are processed through github-flavored markdown converter thus providing you some useful hooks like mklabs/node-yabe#1 or mklabs/node-yabe@da9eee105bd4becb8dd2973bf660509b30ee2be2.

Articles files may be placed in any directory, they're served regardless of where they are located in the repository (and a request on a valid dir would list all articles in that directory and any subdirectories)

<table>
  <thead><tr><th>URL</th><th></th></tr></thead>
  <tbody>
    <tr><td>/articles/test/a-blog-post</td><td>/articles/test/a-blog-post.markdown file</td></tr>
    <tr><td>/articles/test/a-second-blog-post</td><td>/articles/test/a-blog-post.markdown file</td></tr>
    <tr><td>/articles/test</td><td>a list of articles embedded in articles/test folder and its subfolders</td></tr>
    <tr><td>/articles/a-blog-post</td><td>/articles/a-blog-post.markdown file</td></tr>
  </tbody>
</table>

The special page file index.html will be used by default as the entrance page to your blog.

### pages

pages, such as home, about, etc go in the `templates/pages` folder. Basically, if any file or folder is matching given url, yabe will look for similar files in `pages`, allowing you to render a simple about.html to `/about` url. 

One can easily add pages just by creating new files in `pages` folder. Just like articles, these files can be embedded in any folder/subfolder.

### github projects

Any projects that is hosted on github and publicly available (eg. not private), can have its own place on the generated site. Depending on settings defined in config.yml (user, ext), yabe will get the content of the classic README file for this particular project. A request to `/a-badass-project`, assuming you have `a-badass-project` hosted on github, will render `github.project.html` with readme's content.

### sidebars

Sidebar file allow you to define a simple sidebar that you can later use in your templates and pages, heavily inspired by [gollum](http://github.com/github/gollum). It's not as brilliant and is roughly implemented but you can use a custom `_sidebar.markdown` file in your `artciles` or `templates/pages` folder, its content would be available in your template files like so:

    {{if has_sidebar}}
    <div class="article-sidebar">
      {{html sidebar}}
    </div>
    {{/if}}
    
Sidebars affect all pages in their directory and any subdirectories that do not have a sidebar file of their own.


### json api

A simple JSON connect layer is listening for incoming request with `Accept` header set to `application/json` that, instead of serving html output (delivered by templates files), will respond the exact same model provided to the views as json objects. It basically means that any request done with something like `$.getJSON('./valid/route')` would get in return a json result (and one can easily think of building neat single-page app with framework like Sammy.js).

One can think of easily reuse server-side templates (usually rendered by node-jqtpl) to provide a front-end application.

Both valid and 404 routes follows the [JSend spec](http://labs.omniti.com/labs/jsend):

    // Example on ./
    {
        status : "success",
        data : {
            "articles" : [
              {"name": "folder/subfolder/article-name", "title" : "A blog post", "markdown" : "Some useful content...", ... },
              {"name" : "folder/another-article-name", title: "A blog post", "markdown" : "Some useful content...", ... }
         }
    }
    
    // Example for a 404 case
    {
        status : "error",
        message: "Page isn't available"
    }
    
It even has some basic tests to make sure it's working properly and you can run them if you want. You must have api-easy installed to run the tests. Just run `npm install api-easy` if that's not the case.

Then run `vows tests/*.js --spec` to run the simple test suite that quickly validates different json response from the server (must be started).

## deployment

### on your own server

node-yabe is built on top of Connect and exports itself as a Connect sever: _server.js_.

    var yabe = require('./lib/node-yabe'):

    yabe.listen(config.port);

    console.log('Node server is running! and listening on', config.port);

One can add connect layers, or layers that adds or alter yabe's features.

### on nodester

yabe was designed to work well with [nodester](http://nodester.com). Deploying on nodester is really easy, just ask for a nodester access by following these [instructions](http://nodester.com), create a nodester app with `nodester app create`, and push with `git push nodester master`.

    git clone http://github.com/mklabs/node-yabe testyabe
    cd testyabe
    nodester app create testyabe
    nodester app info testyabe

You'll get in return two important informations: port and gitrepo. 

First copy paste the gitrepo from `nodester app info` and add it as a remote repository.

    git remote add nodester ec2-user@nodester.com:/replace/this/with/yours/1234-a123456789bc123d01e9c55c6f6af5a7.git
    
Then, change the `server.js` or `config.yml` file to change the port to the one nodester has assigned to your app. Also, you'll want to change hostAddress to `testyabe.nodester.com` (or whatever name you're using, it's namely used to control cross domain request)  Once done, simply git add, commit and push to get your app started

    git add .
    git commit -m "Changed port to nodester one"
    git push nodester master
    
Test [http://testyabe.nodester.com](http://testyabe.nodester.com) and spread the word about your newly created blog.

### on ec2

_todo_

## configuration

You can configure yabe, by modifying the _config.yml_ file. For example, if you want to set the blog author to 'John Doe', you could add or edit `author: John Doe` inside the `config.yml` file. Here are the defaults, to get you started:

    author:     'John Doe'                                # blog author
    title:      'a blog about ...'                        # site title
    url:        'example.com'                             # site root URL, namely used to control crossdomain request
    root:       'index'                                   # page to load on /
    date:       'YYYY-mm-dd'                              # date format for articles
    disqus:     false                                     # disqus id, or false
    summary:    {max: 150, delim: /~\n/}                  # length of article summary and delimiter
    ext:        'markdown'                                # file extension for articles

## Dependencies

The dependencies are placed in the `node_modules` folder to load them as if they are native modules. no package.json yet

* [connect](http://github.com/senchalabs/connect) 1.2.1
* [mime](http://github.com/bentomas/node-mime) 1.2.1
* [node-jqtpl](http://github.com/kof/node-jqtpl.git) 0.1.0
* [github-flavored-markdown](http://github.com/isaacs/github-flavored-markdown) 1.0.0
* [js-yaml](https://github.com/visionmedia/js-yaml)
* prettify module is a node port of showdown andby [creationix](https://github.com/creationix) for the [Wheat](https://github.com/creationix/wheat) blog engine.

### that has to be done

* Accessing article data from the layout. Article metadata could be available via the context variable, when not in the article templates. This is useful for adding <meta> tags in your <head>, with article information.
* Using markdown in your templates. In your templates, yabe exposes the markdown method, so you can parse markdown in any text.
* page system
* refactor to use templates instead of themes (pages)
* config via yml file (and in templates folder)
* github project
* recursive sidebar
* tags/categgories
* disqus integration
* 404
* 2-3 themes (with one using sammy)
* archives

Think about overall structure. using npm, would be nice to just have a templates repo similar to [Dorothy](https://github.com/cloudhead/dorothy) with a basic server.js/config.yml setup.

Also, configuration should be done using pure yml file (now done with config.js file).

## Thanks!

Tim Caswell([creationix](Tim Caswell)) and [Wheat](https://github.com/creationix/wheat), a really beautiful piece of node hacking. The markdown and pretiffy modules are directly coming from Wheat, the whole is heavily based on Wheat which inspired me this experiments, mostly for fun. I'm using wheat since a few months now to blog and I really think that solutions like Jekyll or Wheat, both based on markdown (textile is also pretty good) are ideal and really pleasant to work with.

Also, a lot of ideas and inspiration is coming from:

* [gollum](http://github.com/github/gollum) - [Tom Preston-Werner](https://github.com/mojombo), [Rick Olson](https://github.com/technoweenie)
* [toto](https://github.com/cloudhead/toto) - [Alexis Sellier](https://github.com/cloudhead)
* [scanty](https://github.com/adamwiggins/scanty) - [Adam Wiggins](https://github.com/adamwiggins)