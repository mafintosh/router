var http = require('http');
var https = require('https');
var common = require('common');
var compile = require('./matcher');

var METHODS = ['get', 'post', 'put', 'del', 'head', 'options'];
var HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];

var NOT_FOUND = function(request, response) {
	response.writeHead(404);
	response.end();
};

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

	if (server) {
		server.router = this;
	}

	this._methods = {};
	this._servers = [];
	this._end = {};
	this._listening = false;
	
	this.on('request', this.route);

	if (options && options.hang) {
		return;
	}

	HTTP_METHODS.forEach(function(method) {
		self._methods[method] = [];
		self._end[method] = NOT_FOUND;
	});
});

METHODS.concat('delete').forEach(function(method) {
	var httpMethod = method.replace('del', 'delete').toUpperCase();

	Router.prototype[method] = function(pattern, rewrite, fn) {
		var self = this;

		if (Array.isArray(pattern)) {
			pattern.forEach(function(item) {
				self[method](item, rewrite, fn);
			});

			return this;
		}

		this.emit('mount', method, pattern, rewrite, fn);

		if (typeof pattern === 'function') {
			this._end[httpMethod] = pattern;
			return;
		}
		if (!fn && typeof rewrite === 'string') {
			fn = this.route;
		}
		if (!fn) {
			fn = rewrite;
			rewrite = null;
		}
		if (rewrite) {
			rewrite = rewrite.replace(/:(\w+)/g, '{$1}'); // normalize
		}

		pattern = compile(pattern);
		this._methods[httpMethod].push(function(request, a, b, c) {
			var next = c || b;
			var index = request.url.indexOf('?');
			var params = request.params = pattern(index === -1 ? request.url : request.url.substring(0, index));

			if (!params) {
				next();
				return;
			}
			if (rewrite) {
				request.url = common.format(rewrite, request.params) + (index === -1 ? '' : request.url.substring(index));
			}

			fn(request, a, b, c);
		});

		return this;
	};
});

Router.prototype.detach = function() {
	this.removeListener('request', this.route);

	return this.route;
};
Router.prototype.upgrade = function(fn) {
	this.on('upgrade', fn);

	return this;
};
Router.prototype.all = function() {
	var self = this;
	var args = arguments;

	METHODS.forEach(function(method) {
		self[method].apply(self, args);
	});

	return this;
};
Router.prototype.route = function(request, response, next) {
	this._find(request, response, next);
};
Router.prototype.address = function() {
	return this.server ? this.server.address() : {};
};
Router.prototype.listen = function(port, callback) {
	var server = this.server = this.server || http.createServer();
	var self = this;

	if (this._listening) {
		server.listen(port);
		return this;
	}
	
	this.bind(server);
	this._listening = true;
	this.once('listening', callback || noop);

	server.on('error', function(err) {
		self.emit('error', err);
	});
	server.on('listening', function() {
		self.emit('listening');
	});
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
	if (this._servers.indexOf(server) > -1) {
		return this;
	}

	server.router = this;
	server.on('request', function(request, response) {
		self.emit('request', request, response);
	});
	server.on('upgrade', function(request, connection, head) {
		if (!self.listeners('upgrade').length) {
			connection.destroy();
			return;
		}

		self.emit('upgrade', request, connection, head);
	});

	this.emit('bind', server);
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
				var callback = common.once(next.parallel().bind(null, null));

				server.once('close', callback);
				server.close(callback);
			});
		},
		function() {
			self.emit('close');
		}
	]);
};

Router.prototype._find = function(request, response, next) {
	var method = request.method;
	var routes = this._methods[method];
	var end = this._end[method];
	var index = 0;

	if (!routes) {
		request.destroy();
		return;
	}

	var loop = function(err) {
		if (err && next) {
			next(err);
			return;
		}
		if (index >= routes.length) {
			if (next && (!end || end === NOT_FOUND)) {
				next();
				return;
			}

			end(request, response, noop);
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