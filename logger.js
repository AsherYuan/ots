var log4js = require('log4js');
var path = require('path');

log4js.configure({
	appenders: [
		{type: 'console'},
		{type: 'file', filename: 'logs/log4js.log', 'maxLogSize': 1024 * 1024, 'backups': 10}
	]
});

var logger = null;

/**
 * 获取日志，单例模式实现
 * @returns {*}
 */
var getLogger = function () {
	if (logger == null) {
		logger = log4js.getLogger(path.basename(__filename));
		return logger;
	} else {
		return logger;
	}
};

exports.info = function (content) {
	var logger = getLogger();
	logger.info(content);
};

exports.debug = function (content) {
	var logger = getLogger();
	logger.debug(content);
};

exports.warn = function (content) {
	var logger = getLogger();
	logger.warn(content);
};

exports.error = function (content) {
	var logger = getLogger();
	logger.error(content);
};

exports.trace = function (content) {
	var logger = getLogger();
	logger.trace(content);
};
