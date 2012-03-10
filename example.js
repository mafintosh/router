var router = require('router').create();
var prefixed = router.prefix('/foo')

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

prefixed.get('/test', function(req, res) {
	res.writeHead(200);
	res.end('prefix test!');
});
prefixed.get('/test/{sub}', function(req, res) {
	res.writeHead(200, {'content-type':'application/javascript'});
	res.end(JSON.stringify(req.params));
});

router.all(function(req, res) {
	res.writeHead(200);
	res.end('olla mundo');
});


router.listen(9999);