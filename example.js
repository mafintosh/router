var router = require('router').create();

router.get('/s/{prefix}?/{top}', function(req, res) {
	res.writeHead(200, {'content-type':'application/javascript'});
	res.end(JSON.stringify(req.params));
});
router.get('/s/{prefix}?/{top}/*.*', function(req, res) {
	res.writeHead(200, {'content-type':'application/javascript'});
	res.end(JSON.stringify(req.params));
});
router.get('/s/{prefix}?/{top}/*', function(req, res) {
	res.writeHead(200, {'content-type':'application/javascript'});
	res.end(JSON.stringify(req.params));
});
router.all(function(req, res) {
	res.writeHead(200);
	res.end('olla mundo');
});

router.listen(9999);