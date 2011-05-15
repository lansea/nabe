# nabe - a git-based blog engine

**nabe** is a git-powered, minimalist blog engine for coders.

A blog is simply a Git repository that adhere to a specific format. Posts can be edited in a number of ways depending on your needs. If not run through a valid git repo, it won't break and will fallback to the file system but i'll miss most of neat features that Git provides such as articles' revision and history, search using `git grep`, ...

You'll usually write your posts in your favorite text editor, with your favorite markup (which is most likely [Markdown](http://daringfireball.net/projects/markdown/syntax), isn't it?). Then save the post's file, `git add/commit` the post, and then `git push origin master`.

## Philosophy & goals

_not another blog engine.. well.. yes it is.._

**nabe is currently actively being developed, emphasis is now on completing the administration interface (and making it great)**

Git is a fantastic tool, it is a totally different way to operate on data. It's much more than a VCS and can provide really, **really**, neat features when applied and used by an application like a blog. There's already plenty of git-based blog engine that are doing it genuinely right. In the node ecosystem, there is the well known [Wheat](https://github.com/creationix/wheat) blog engine that is a really beautiful piece of node hacking. My goal in building this was to provide me another blog engine, backed by git and written in node, based on the fantastic work done on Wheat (that I actually personally use), with some additional features.

It was not intended to be featureful, but as the time goes, more and more features were added (such as an admin web ui, search using `git grep` (fast!), tag/categories, archives, ...), while trying really hard to keep it tiny and simple.

## Install


    git clone git://github.com/mklabs/nabe.git
    cd nabe
    npm link
    
You may want to checkout the remote `dev` branch to get latest updates before running npm link.
    
_Note that you could run `npm link` with the `--npath` flag to run the tests right away. Alternately, you can run them with `npm test`._

You would start by forking or cloning the [nabe-demo](https://github.com/mklabs/nabe-demo) repo, to get a basic skeleton.
    
    git clone git://github.com/mklabs/nabe-demo.git weblog
    cd weblog/
    npm link nabe
    node server.js
    
Boom, navigate to http://localhost:5678 to see nabe in action. Check `config.xml` for other options.

Basically you need to run nabe within a git repo. Make sure to [`git pack-refs`](http://www.kernel.org/pub/software/scm/git/docs/git-pack-refs.html) and have some commits to test revisions and history. Note that this is **not** mandatory it falls back to the file system if either git or `.git/pack-refs` were not available (but you'll miss search, revisions and so on..)

This is possible thanks to [node-git](https://github.com/creationix/node-git), a thin wrapper around the command-line git command to read files out of a git repository as if they were local files.

This project respectfully uses code from and thanks the authors of:

* [connect](https://github.com/senchalabs/connect)
* [wheat](https://github.com/creationix/wheat)
* [findit](https://github.com/substack/node-findit)
* [github-flavored-markdown](https://github.com/isaacs/github-flavored-markdown)
* [git-fs](https://github.com/creationix/node-git)
* [jquery-global](https://github.com/jquery/jquery-global)
* [jqtpl](https://github.com/kof/node-jqtpl)
* [yaml](https://github.com/visionmedia/js-yaml)
* [h5b-server-config for node](https://github.com/paulirish/html5-boilerplate-server-configs/blob/master/node.js)
* [ace](https://github.com/ajaxorg/ace)


## Features

* Posts (...)
* Tags/Categories
* a sweet admin interface to edit/create posts (using ace with custom markdown syntax highlight), backed by git commits.
* revisions and posts history through git commits.
* efficient search and archives, courtesy of `git grep`.
* Markdown (using [github-flavored-markdown](https://github.com/isaacs/github-flavored-markdown) converter)
* code syntax highlighting ([Prettify](http://code.google.com/p/google-code-prettify/))
* date formating using a port of [jquery-global](https://github.com/jquery/jquery-global)
* rss feed
* Comments via Disqus
* simple route => page system
* github project page (generated remotely from readmes)
* rather comprehensive JSON api (each valid route in the blog system could be requested with json xhr --> generates raw json response and allow dual-side templating approach).

## How it works

* content is entirely managed through git; it falls back to the file system if not available
* articles are stored as .markdown files, with embedded metadata (in yaml format)
* articles are passed through [github-flavored-markdown](https://github.com/isaacs/github-flavored-markdown) converter
* templating is done through [jqtpl](https://github.com/kof/node-jqtpl) by default (plans are underway to make it possible to easily the template engine used internally, so that you can use your favorite one.)
* nabe is built right on top of Connect. It takes advantage of HTTP caching and uses html5-boilerplate server config startup file.
* comments are handled by disqus
* individual articles can be accessed through urls such as `/folder/subfolder/blogging-with-nabe` that would render `bloging-with-nabe.markdown` file in `/folder/subfolder` directory.
* relatedly, the list of articles in `/folder/subfolder/` can be accessed as categories with `/category/folder/subfolder` URL (thus folders can be seen as a way of providing simple hierarchical categories).
* arbitrary metadata can be included in articles files, and accessed from the templates.
* summaries are generated following the `delimiter` settings

## Documentation

Apart from the overview provided in this README.md file, nabe uses [docco](http://jashkenas.github.com/docco/) to provide comprehensive source code documentation. Check out [`/docs/nabe.html`](http://mklabs.github.com/nabe/docs/nabe.html) for more information.


## Overview

    git clone git://github.com/mklabs/nabe.git
    cd nabe
    npm link
    
You may want to checkout the remote `dev` branch to get latest updates before running npm link.
    
_Note that you could run `npm link` with the `--npath` flag to run the tests right away. Alternately, you can run them with `npm test`._

You would start by forking or cloning the [nabe-demo](https://github.com/mklabs/nabe-demo) repo, to get a basic skeleton.
    
    git clone git://github.com/mklabs/nabe-demo.git weblog
    cd weblog/
    npm link nabe
    node server.js

You would then edit the template at will, it has the following structure:
    
    articles/                       # default posts folder (defined in config.yml)
    |
    config.yml                      # configuration file, values defined here are merged with config.js file from nabe module
    |
    server.js                       # a basic server startup file
    |
    themes/                         # default themes folder (defined in config.yml)
      |
      +- default/                   # theme folder (defined in config.yml)
        |
        +- public/                  # static files go here (js, css, img)
        |
        +- archives.html            # page loaded from `/archives`
        |
        +- article.html             # the article (post) page
        |
        +- feed.xml                 # the basic template for the rss feed
        |
        +- github.html              # page loaded from `/a-github-project`, following the github.user config
        |
        +- index.html               # the default page loaded from `/`, it displays the list of articles
        |
        +- layout.html              # the main site layout, shared by all pages
        |
        +- 404.html                 # the default 404 page
        |
        +- pages/                   # pages, such as about, contact etc go here
           |
           +- about.html            # the page loaded for `/about` url
           |
           +- whatever.html         # same goes for whatever page, loaded for `/whatever` url
           |
      +- yourtheme/                 # another theme folder
      
### configuration

You can configure nabe, by modifying the _config.yml_ file. For example, if you want to set the blog author to 'John Doe', you could add or edit `author: John Doe` inside the `config.yml` file. Here are the defaults:

    author:       John Doe
    title:        a blout about
    description:  not another blog engine.. well.. yes it is..
    format:       F
    culture:      en
    theme:        sammo
    disqus:       ''
    ext:          markdown
    port: 5678
    summary:
      delim: '<!--more-->|##'
    github:
      user: mklabs
      ext: markdown

Check out [`/docs/config.html`](http://mklabs.github.com/nabe/docs/config.html) for more information.

       
### articles

You could then create a .markdown article file in the `articles/` folder, and make sure it has the following format:

    Title: What a node weekend !
    Author: John Doe
    Date: Apr 24 2011 17:08:00 GMT+0200 (CDT)

    There's no `sleep()` in JavaScript.. Nor does it have goto, Duh.
    

Tags are defined using the `Categories` property

    Categories: node, readme, blog

Basically the top of the file is in YAML format, and the rest of it is the blog post. They are delimited by an empty line `/\n\n/`, as you can see above. 

None of the information is mandatory, but it's strongly encouraged you specify it. Arbitrary metadata can be included in articles files, and accessed from the templates.

Articles are processed through [github-flavored-markdown](https://github.com/isaacs/github-flavored-markdown) converter thus providing you some useful hooks like mklabs/nabe#1 or mklabs/nabe@da9eee105bd4becb8dd2973bf660509b30ee2be2. Snippets of code are passed through [Prettify](http://code.google.com/p/google-code-prettify/) syntax highlighting.

Articles files may be placed in any directory, they're served regardless of where they are located in the `articles` directory (and a request on a valid dir would list all articles in that directory and any subdirectories, if any markdown file is available for that URL)

### pages

pages, such as home, about, etc go in the `templates/pages` folder. Basically, if any file or folder is matching given url, nabe will look for similar files in `pages`, allowing you to render a simple about.html to `/about` url. 

One can easily add pages just by creating new files in `pages` folder.

### github projects

Any projects that is hosted on github and publicly available (eg. not private), can have its own place on the generated site. Depending on settings defined in config.yml (user, ext), nabe will get the content of the classic README file for this particular project. A request to `/a-badass-project`, assuming you have `a-badass-project` hosted on github, will render `github.project.html` with readme's content.

### sidebars

Sidebar file allow you to define a simple sidebar that you can later use in your templates and pages, heavily inspired by [gollum](http://github.com/github/gollum). It's not as brilliant and is roughly implemented but you can use a custom `_sidebar.markdown` file in your `artciles` folder, its content would be available in your template files like so:

    {{if has_sidebar}}
    <div class="article-sidebar">
      {{html sidebar}}
    </div>
    {{/if}}


### json api

A simple connect layer is listening for incoming request with `Accept` header set to `application/json` that, instead of serving html output (delivered by templates files), will respond the exact same model provided to the views as raw json response.

Each valid route in the blog system could be requested with json xhr --> generates raw json response and allow dual-side templating approach. It basically means that any request done with something like `$.getJSON('./valid/route')` would get in return a json result (and one can easily think of building neat single-page app with framework like Sammy.js or Backbone). The sammo theme available in this repo uses [Sammy.js](https://github.com/quirkey/sammy) with [pushState](https://github.com/quirkey/sammy/tree/non-hash) to handle page transitions.

## deployment

### on your own server

nave is built on top of Connect and exports itself as a Connect sever: _server.js_.

    var nabe = require('./lib/nabe'),
    config = nabe.config;

    nabe.listen(config.port);

## Thanks!

Tim Caswell([creationix](Tim Caswell)) and [Wheat](https://github.com/creationix/wheat), a really beautiful piece of node hacking. The pretiffy modules are directly coming from Wheat, the whole is heavily based on Wheat which inspired me this experiments. I'm using wheat since a few months now to blog and I really think that markdown+git-based solutions like toto, Jekyll or Wheat, are ideal and really pleasant to work with.

Also, a lot of ideas and inspiration is coming from:

* [gollum](http://github.com/github/gollum) - [Tom Preston-Werner](https://github.com/mojombo), [Rick Olson](https://github.com/technoweenie)
* [toto](https://github.com/cloudhead/toto) - [Alexis Sellier](https://github.com/cloudhead)
* [scanty](https://github.com/adamwiggins/scanty) - [Adam Wiggins](https://github.com/adamwiggins)

## Licence

               DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
                       Version 2, December 2004

    Copyright (C) 2008 Simon Rozet <simon@rozet.name>
    Everyone is permitted to copy and distribute verbatim or modified
    copies of this license document, and changing it is allowed as long
    as the name is changed.

               DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
      TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

     0. You just DO WHAT THE FUCK YOU WANT TO.