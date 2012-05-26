# Router

A lean and mean http router for [node.js](http://nodejs.org).  
It is available through npm:

	npm install router
	
# Usage

Router does one thing and one thing only - route http requests.

``` js
var http = require('http');
var router = require('router');
var route = router();

route.get('/', function(req, res) {
	res.writeHead(200);
	res.end('hello index page');
});

http.createServer(function(req, res) {
	route(req, res, function() {
		res.writeHead(404);
		res.end('no route matched...');
	});
}).listen(8080); // start the server on port 8080
```

If you want to grap a part of the path you can use capture groups in the pattern:

``` js
route.get('/{base}', function(request, response) {
	var base = request.params.base; // ex: if the path is /foo/bar, then base = foo
});
```

The capture patterns matches until the next `/` or character present after the group

``` js
route.get('/{x}x{y}', function(request, response) {
	// if the path was /200x200, then request.params = {x:'200', y:'200'}
});
```

Optional patterns are supported by adding a `?` at the end

``` js
route.get('/{prefix}?/{top}', function(request, response) {
	// matches both '/a/b' and '/b'
});
```

If you want to just match everything you can use a wildcard `*` which works like unix wildcards

``` js
route.get('/{prefix}/*', function(request, response) {
	// matches both '/a/', '/a/b', 'a/b/c' and so on.
	// the value of the wildcard is available through request.params.wildcard
});
```

If the standard capture groups aren't expressive enough for you can specify an optional inline regex 

``` js
route.get('/{digits}([0-9]+)', function(request, response) {
	// matches both '/24' and '/424' but not '/abefest' and so on.
});
```

You can also use regular expressions and the related capture groups instead:

``` js
route.get(/^\/foo\/(\w+)/, function(request, response) {
	var group = request.params[1]; // if path is /foo/bar, then group is bar
});
```

# Methods:

* `route.get`:  Match `GET` requests
* `route.post`: Match `POST` requests
* `route.put`:  Match `PUT` requests
* `route.head`: Match `HEAD` requests 
* `route.del`:  Match `DELETE` requests
* `route.all`:  Match all above request methods.
