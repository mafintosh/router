var assert = require('assert');
var route = require('../index')();

var count = 0;
var order = ['GET','POST','OPTIONS','HEAD','DELETE','PUT'];

route.all('/', function(req, res) {
	assert.equal(req.method, order[count]);
	assert.equal(req.url, '/');
	count++;
});

route({method:'GET', url:'/'});
route({method:'POST', url:'/'});
route({method:'OPTIONS', url:'/'});
route({method:'HEAD', url:'/'});
route({method:'DELETE', url:'/'});
route({method:'PUT', url:'/'});

route({method:'GET', url:'/a'});
route({method:'POST', url:'/a'});
route({method:'OPTIONS', url:'/a'});
route({method:'HEAD', url:'/a'});
route({method:'DELETE', url:'/a'});
route({method:'PUT', url:'/a'});

route({method:'NOT_GET', url:'/'});

assert.equal(count, 6);