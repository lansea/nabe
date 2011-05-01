module.exports = {
  // control cross domain if you want. allow cross domain (for your subdomains) disallow other domains.
  hostAddress: 'localhost|nodester.com|amazonaws',
  
  // server port
  port: 9606,
  
  // articles dir path
  // you could set up whatever folder you like here `articles/any/sub/level/folder`
  articleDir: 'articles',
  
  // themes folder path
  themeDir: 'themes',
  
  // theme folder name
  theme: 'sammo',
  
  // one of [the standard format](https://github.com/jquery/jquery-global#dates) for jquery.global plugin
  format: 'F',
  
  // ideally any valid culture files in [globinfo](https://github.com/jquery/jquery-global/tree/master/globinfo)
  // either en, fr, ja, ru, es for now
  culture: 'fr',
  
  github: {
    user: 'mklabs',
    ext: 'markdown'
  }
  
};