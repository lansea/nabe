// ## Basic APIeasy suite to quickly test json api layer

// Run `vows tests/*.js`(you must have easy api-easy installed -> `npm install api-easy`)
    
process.chdir(__dirname);

var APIeasy = require('api-easy'),
    assert = require('assert'),
    nabe = require('../lib/nabe');

nabe.listen(nabe.config.port);

console.log('Node server is running! and listening on', nabe.config.port);
    
var suite = APIeasy.describe('json api test suite');

suite.discuss('When using application/json in any request')
  .use('localhost', nabe.config.port)
  .setHeader('Accept', 'application/json')
  .setHeader('Content-Type', 'application/json')
  
  // test the index path
  .get('/')
    .expect(200)
    .expect('should respond with valid articles list', function(err, res, body) {
      var result = JSON.parse(body), articles = result.articles;
      
      assert.ok(articles);
      assert.isArray(articles);
      assert.ok(articles.length);
      
      articles.forEach(function(art, i) {
        assert.isString(art.author);
        assert.isString(art.date);
        assert.isArray(art.categories);
        assert.isString(art.markdown);
        assert.isString(art.name);
      });

    })

  // test the index path
  .get('/article/test/recursive-test/')
    .expect(200)
    .expect('should respond with valid article', function(err, res, body) {
      var result = JSON.parse(body), art = result.article;
      assert.ok(result);
      assert.ok(art);
      assert.isString(art.author);
      assert.isString(art.date);
      assert.isArray(art.categories);
      assert.isString(art.markdown);
      assert.isString(art.name);
    })
    
    .expect('should content key be html and have some', function(err, res, body) {
      var result = JSON.parse(body);

      // it should be html
      assert.ok(/<\w+>/.test(result.content));
    })
    
  // should respond with description
  .get('/this/route/does/not/exist/')
    .expect(200, {description: 'a simple example of a pluggable connect layer'})
    .export(module);
    
    