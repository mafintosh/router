var assert = require('assert');
var route = require('../index')();

var order = ['GET','GET','GET','POST','POST','POST'];
var count = 0;
var a = 0;

route.get('/', function() {
	a++;
});
route.all(function(req, res) {
	assert.equal(req.method, order[count]);
	assert.notEqual(req.url, '/');
	count++;
});

route({method:'GET', url:'/'});
route({method:'GET', url:'/?query'});
route({method:'GET', url:'/a'});
route({method:'GET', url:'/abe'});
route({method:'GET', url:'/abefest'});
route({method:'POST', url:'/a'});
route({method:'POST', url:'/abe'});
route({method:'POST', url:'/abefest'});
route({method:'NOT_GET', url:'/'});

assert.equal(count, 6);
assert.equal(a, 2);