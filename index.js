var http = require('http');
var https = require('https');
var common = require('common');
var matcher = require('./matcher');

var noop = function() {};
var bufferify = function(param) {
	if (Buffer.isBuffer(param)) {
		return param;
	}
	if (param.indexOf('\n') > -1) {
		return new Buffer(param);
	}

	return require('fs').readFileSync(param);
};

var createRouter = function(options) {
	var that = common.createEmitter();

	options = options || {};
	
	if (options.router) {
		return options.router;
	}
	if (typeof options.listen === 'function') {
		return createRouter({server:options, autoclose:false});
	}
	
	var methods = {upgrade:[], get:[], put:[], post:[], head:[], 'delete':[], options:[]};	
	var server = options.server || (options.key ? https.createServer({key:bufferify(options.key),cert:bufferify(options.cert)}) : http.createServer());
	
	that.autoclose = options.autoclose !== false;
	that.server = server;
	that.router = server.router = that;

	server.on('listening', function() {
		that.emit('listening');
	});
	server.on('close', function() {
		that.emit('close');
	});
	
	var find = function(handlers, request, a, b) {
		if (!handlers) {
			return false;
		}
		for (var i = 0; i < handlers.length; i++) {
			if (handlers[i](request, a, b)) {
				return true;
			}
		}

		return false;
	};
	var onrequest = function(request, response) {
		that.emit('request', request, response);
		that.route(request, response);		
	};
	var onupgrade = function(request, connection, head) {
		that.emit('upgrade', request, connection, head);

		if (find(methods.upgrade, request, connection, head)) {
			return;
		}
		if (that.listeners('upgrade').length || server.listeners('upgrade').length > 1) {
			return;
		}

		connection.destroy();
	};
	
	that.bind = function(server, options) {
		if (options && typeof options === 'object' && typeof server === 'number') {
			return that.bind(https.createServer(options).listen(server));
		}
		if (typeof server === 'number' || typeof server === 'string') {
			return that.bind(http.createServer().listen(server));
		}

		server.on('request', onrequest);
		server.on('upgrade', onupgrade);

		return that;
	};
	that.route = function(request, response) {
		if (find(methods[request.method.toLowerCase()], request, response) || !that.autoclose) {
			return;
		}
		if (that.listeners('request').length || server.listeners('request').length > 1) {			
			return;
		}
		if (request.method === 'POST' || request.method === 'PUT') { // TODO: check if node doesn't already do this
			request.connection.destroy(); // don't waste bandwidth on data we don't want
			return;
		}

		response.writeHead(404);
		response.end();
	};
		
	var router = function(methods) {
		return function(pattern, rewrite, fn) {
			if (arguments.length === 1) {
				fn = pattern;
				rewrite = undefined;
				pattern = /.*/;
			}
			if (!fn) {
				fn = rewrite;
				rewrite = undefined;
			}

			var match = matcher(pattern);

			rewrite = rewrite && rewrite.replace(/\$(\d+)/g, '{$1}');
			methods.push(function(request, a, b) {
				var matches = match(request.url.split('?')[0]);

				if (matches) {
					if (rewrite) {
						request.url = common.format(rewrite, matches);
					}

					request.params = matches;
					fn(request, a, b);

					return true;
				}

				return false;
			});
		};
	};
	
	var fns = ['get', 'put', 'del', 'post', 'head', 'options'];
	
	fns.forEach(function(method) {
		that[method] = router(methods[method.replace('del', 'delete')]);
	});
	
	that.upgrade = router(methods.upgrade);

	that.all = function() {
		var args = arguments;
		
		fns.forEach(function(method) {
			that[method].apply(that, args);
		});
	};	
	that.close = function() {
		server.close.apply(server, arguments);
	};
	that.listen = function(port, callback) {
		if (typeof port === 'function') {
			callback = port;
			port = undefined;
		}

		port = port || (options.key ? 443 : 80);
		server.listen(port, callback || noop);
	};
	
	return that.bind(server);
};

exports.create = createRouter;