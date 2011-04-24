// ## Basic APIeasy suite to quickly test json api layer

// Run `vows tests/*.js`(you must have easy api-easy installed -> `npm install api-easy`)

var APIeasy = require('api-easy'),
    assert = require('assert');
    
var suite = APIeasy.describe('json api test suite');

suite.discuss('When using application/json in any request')
  .use('localhost', 3001)
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
        assert.isNumber(+new Date(art.date));
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
      assert.isNumber(+new Date(art.date));
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
    