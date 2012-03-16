var router = require('router');

var server = router();

server.get('/s/{prefix}?/{top}', function(req, res) {
	res.writeHead(200, {'content-type':'application/javascript'});
	res.end(JSON.stringify(req.params));
});
server.get('/s/{prefix}?/{top}/*.*', function(req, res) {
	res.writeHead(200, {'content-type':'application/javascript'});
	res.end(JSON.stringify(req.params));
});
server.get('/s/{prefix}?/{top}/*', function(req, res) {
	res.writeHead(200, {'content-type':'application/javascript'});
	res.end(JSON.stringify(req.params));
});

var ns = server.namespace('ns');

ns.get('/', function(req, res) {
	res.writeHead(200);
	res.end('i am ns root');
});
ns.all(function(req, res) {
	res.writeHead(200);
	res.end('olla from namespace');
});

server.all(function(req, res) {
	res.writeHead(200);
	res.end('olla mundo');
});

server.listen(9999);