var http = require('http');
var https = require('https');
var common = require('common');
var compile = require('./lib/matcher');

var METHODS = ['get', 'post', 'put', 'del', 'head', 'options'];
var HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'UPGRADE', 'OPTIONS'];

var noop = function() {};
var toBuffer = function(param) {
	if (param.cert && param.key) {
		param.cert = toBuffer(param.cert);
		param.key = toBuffer(param.key);
		return param;
	}
	if (Buffer.isBuffer(param)) {
		return param;
	}
	if (param.indexOf('\n') > -1) {
		return new Buffer(param);
	}

	return require('fs').readFileSync(param);
};

var Router = common.emitter(function(server, options) {
	var self = this;

	this.route = this.route.bind(this);
	this.router = this;
	this.server = server;
	this.last = {};

	if (server) {
		server.router = this;
	}

	this._methods = {};
	this._servers = [];
	
	if (options && options.hang) {
		return;
	}

	HTTP_METHODS.forEach(function(method) {
		var type = method === 'UPGRADE' ? 'upgrade' : 'request';

		self._methods[method] = [];
		self.last[method] = function(request, response) {
			if (type === 'upgrade' && !self.listeners('upgrade').length) {
				response.destroy(); // to support legacy interface we need to check if anyone else is listening
				return;
			}

			response.writeHead(404);
			response.end();
		};
	});

});

METHODS.concat('upgrade').forEach(function(method) {
	var httpMethod = method.replace('del', 'delete').toUpperCase();

	Router.prototype[method] = function(pattern, rewrite, fn) {
		var self = this;

		if (Array.isArray(pattern)) {
			pattern.forEach(function(item) {
				self[method](item, rewrite, fn);
			});

			return this;
		};
		if (typeof pattern === 'function') {
			this.last[httpMethod] = pattern;
			return;
		}
		if (!fn && typeof rewrite === 'string') {
			fn = this.route;
		}
		if (!fn) {
			fn = rewrite;
			rewrite = null;
		}

		pattern = compile(pattern);
		this._methods[httpMethod].push(function(request, a, b, c) {
			var next = c || b;
			var params = request.params = pattern(request.url);

			if (!params) {
				next();
				return;
			}
			if (rewrite) {
				request.url = common.format(rewrite, request.params);
			}

			fn(request, a, b, c);
		});

		return this;
	};
});

Router.prototype.all = function() {
	var self = this;
	var args = arguments;

	METHODS.forEach(function(method) {
		self[method].apply(self, args);
	});

	return this;
};
Router.prototype.route = function(request, response) {
	this._find(request.method, request, response);
};
Router.prototype.listen = function(port, callback) {
	var server = this.server || http.createServer();

	this.bind(server);

	server.once('listening', callback || noop);
	server.listen(port);

	return this;
};
Router.prototype.bind = function(server, ssl) {
	var self = this;
	var notServer = typeof server === 'number' || typeof server === 'string';

	if (notServer && ssl && typeof ssl === 'object') {
		return this.bind(https.createServer(toBuffer(ssl)).listen(server));
	}
	if (notServer) {
		return this.bind(http.createServer().listen(server));
	}

	server.router = this;
	server.on('request', function(request, response) {
		self._find(request.method, request, response);
		self.emit('request', request, response);
	});
	server.on('upgrade', function(request, connection, head) {
		self._find('UPGRADE', request, connection, head);
		self.emit('upgrade', request, console, head);
	});

	this._servers.push(server);

	return this;
};
Router.prototype.close = function(callback) {
	var self = this;

	this.once('close', callback || noop);

	common.step([
		function(next) {
			if (!self._servers.length) {
				next();
				return;
			}

			self._servers.forEach(function(server) {
				server.close(next.parallel());
			});
		},
		function() {
			self.emit('close');
		}
	]);
};
Router.prototype.namespace = Router.prototype.prefix = function(prefix) {
	var router = new Router();

	prefix = '/'+prefix.replace(/^\//, '').replace(/\/$/, '');
	this.all(prefix+'/*', '/{*}', router.route).all(prefix, '/', router.route);

	return router;
};

Router.prototype._find = function(method, request, response) {
	var routes = this._methods[method];
	var last = this.last[method] || noop;
	var index = 0;

	if (!routes) {
		request.destroy();
		return;
	}

	var loop = function() {
		if (index >= routes.length) {
			last(request, response);
			return;
		}

		routes[index++](request, response, loop);
	};

	loop();
};

module.exports = function(options) {
	if (!options) {
		return new Router();
	}
	if (options.router) {
		return options.router;
	}
	if (typeof options.listen === 'function') {
		return new Router(options, {hang:true});
	}
	if (options.cert) {
		return new Router(https.createServer(toBuffer(options.cert)));
	}

	return new Router();
};

module.exports.create = module.exports;