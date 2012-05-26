var assert = require('assert');
var route = require('../index')();

var count = 0;
var a = 0;

route.get('/', function() {
	a++;
});
route.get(function(req, res) {
	assert.equal(req.method, 'GET');
	assert.notEqual(req.url, '/');
	count++;
});

route({method:'GET', url:'/'});
route({method:'GET', url:'/?query'});
route({method:'GET', url:'/a'});
route({method:'GET', url:'/abe'});
route({method:'GET', url:'/abefest'});
route({method:'NOT_GET', url:'/'});

assert.equal(count, 3);
assert.equal(a, 2);