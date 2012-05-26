var assert = require('assert');
var route = require('../index')();

var count = 0;

route.get('/', function(req, res) {
	assert.equal(req.method, 'GET');
	assert.equal(req.url, '/');
	count++;
});

route({method:'GET', url:'/'});
route({method:'NOT_GET', url:'/'});

assert.equal(count, 1);