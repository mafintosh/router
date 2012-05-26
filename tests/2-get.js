var assert = require('assert');
var route = require('../index')();

var a = 0;
var b = 0;

route.get('/', function(req, res) {
	assert.equal(req.method, 'GET');
	assert.ok(req.url in {'/':1,'/?query':1});
	a++;
});
route.get('/b', function(req, res) {
	assert.equal(req.method, 'GET');
	assert.ok(req.url in {'/b':1,'/b?query':1});
	b++;
});

route({method:'GET', url:'/'});
route({method:'GET', url:'/?query'});
route({method:'GET', url:'/query'});
route({method:'NOT_GET', url:'/'});

route({method:'GET', url:'/b'});
route({method:'GET', url:'/b?query'});
route({method:'GET', url:'/query'});

assert.equal(a, 2);
assert.equal(b, 2);