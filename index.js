var http = require('http');
var https = require('https');
var common = require('common');

var matcher = require('./matcher');

var createRouter = function(options) {
	var that = common.createEmitter();
	
	options = options || {};
	
	// TODO: maybe listen for # of request handlers on the server to decide whether to autoclose

	if (options.router) {
		return options.router;
	}
	if (typeof options.listen === 'function') {
		return createRouter({server:options, autoclose:false});
	}
	
	var methods = {upgrade:[], get:[], put:[], post:[], head:[], 'delete':[], options:[]};	
	var server = options.server || (options.key ? https.createServer({key:options.key,cert:options.cert}) : http.createServer());
	
	that.autoclose = options.autoclose !== false;
	that.server = server;
	that.router = server.router = that;
	
	var find = function(handlers, request, a, b) {
		for (var i = 0; i < handlers.length; i++) {
			if (handlers[i](request, a, b)) {
				return true;
			}
		}
		return false;
	};
	
	that.route = function(request, response) {
		if (find(methods[request.method.toLowerCase()], request, response) || !that.autoclose) {
			return;
		}
		if (that.listeners('request').length) {			
			return;
		}
		if (request.method === 'POST' || request.method === 'PUT') { // TODO: check if node doesn't already do this
			request.connection.destroy(); // don't waste bandwidth on data we don't want
			return;
		}
		response.writeHead(404);
		response.end();
	};
	
	server.on('request', function(request, response) {
		that.emit('request', request, response);
		that.route(request, response);
	});
	server.on('upgrade', function(request, connection, head) {
		that.emit('upgrade', request, connection, head);

		if (find(methods.upgrade, request, connection, head)) {
			return;
		}
		if (that.listeners('upgrade').length) {
			return;
		}
		connection.destroy();		
	});	
	
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
	
	that.all = function() {
		var args = arguments;
		
		fns.forEach(function(method) {
			that[method].apply(that, args);
		});
	};

	that.upgrade = router(methods.upgrade);
	
	that.close = function() {
		server.close.apply(server, arguments);
	};
	that.listen = function() {
		server.listen.apply(server, arguments);
	};
	
	return that;
};

exports.create = createRouter;