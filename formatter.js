var Param = function(item) {
	this.item = item;
};

Param.prototype.toString = function(params) {
	return params[this.item];
};

module.exports = function(format) {
	if (!format) return null;

	format = format.replace(/\{\*\}/g, '*').replace(/\*/g, '{*}').replace(/:(\w+)/g, '{$1}'); // normalize
	format = format.match(/(?:[^\{]+)|(?:{[^\}]+\})/g).map(function(item) {
		return item[0] !== '{' ? item : new Param(item.substring(1, item.length-1));
	});

	return function(params) {
		return format.reduce(function(item, result) {
			return result+item.toString(params);
		}, '');
	};
};
