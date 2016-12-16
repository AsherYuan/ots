var logger = require('./logger');

/**
 * 客户端数组
 * @type {Array}
 */
var clients = [];

/**
 * 客户端对象：
 * clientId:由ipAddress:port为ID，进行初始化，存入相关变量
 */
var Client = function (clientId, ipAddress, code, sock) {
	var pub = {
		clientId: '',
		ipAddress: '',
		code: '',
		sock: null,
		lasthbTime: new Date().getTime(),
		serialno: '',
		setCode: function (code) {
			pub.code = code;
		},
		hb: function () {
			pub.lasthbTime = new Date().getTime();
		},
		setSerialno: function (serialno) {
			pub.serialno = serialno;
		}
	};
	pub.clientId = clientId;
	pub.ipAddress = ipAddress;
	pub.code = code;
	pub.sock = sock;
	pub.lasthbTime = new Date().getTime();
	return pub;
};

/**
 * 通过构造函数向容器内添加客户端
 * @param clientId
 * @param ipAddress
 * @param code
 * @param sock
 */
exports.add = function (clientId, ipAddress, code, sock) {
	logger.error("调用了OnlineHolder.add");
	var it = new Client(clientId, ipAddress, code, sock);
	clients.push(it);
};

/**
 * 获取所有
 */
exports.getAll = function() {
	return clients;
};

/**
 * 判断当前数据列表中主控是否存在
 * @param clientId
 * @returns {boolean}
 */
exports.exist = function (clientId) {
	if(!!clients && clients.length > 0) {
		for (var i = 0; i < clients.length; i++) {
			if (clients[i].clientId === clientId) {
				return true;
			}
		}
		return false;
	} else {
		return false;
	}
};

/**
 * 心跳检测，并回收连接资源
 */
// TODO 出现多个连接的过程中是否可能有BUG?
exports.refreshClients = function () {
	for (var i = 0; i < clients.length; i++) {
		if ((new Date().getTime() - clients[i].lasthbTime) > 60000) {
			logger.error("主控(" + clients[i].clientId + "):心跳失败，断开连接，回收资源");
			clients[i].sock.destroy();
			// if(clients.length > 1) {
			// 	console.log(clients[i].clientId + ":" + clients[i].ipAddress + ":" + clients[i].code);
			// 	logger.info(clients[i].clientId + ":" + clients[i].ipAddress + ":" + clients[i].code);
			// 	clients[i].splice(i, 1);
			// } else {
			// 	clients = [];
			// }
		}
	}
};

/**
 * 刷新心跳记录
 * @param clientId
 */
exports.heartbeat = function (clientId) {
	for (var i = 0; i < clients.length; i++) {
		if (clients[i].clientId === clientId) {
			clients[i].hb();
		}
	}
};

/**
 * 更新serialno和code两个值
 * @param clientId
 * @param code
 * @param serialno
 */
exports.update = function (clientId, code, serialno) {
	for (var i = 0; i < clients.length; i++) {
		if (clients[i].clientId === clientId) {
			clients[i].setCode(code);
			clients[i].setSerialno(serialno);
		}
	}
};

/**
 * 根据serialno获取client
 * @param serialno
 * @returns {*}
 */
exports.getBySerialno = function (serialno) {
	for (var i = 0; i < clients.length; i++) {
		if (clients[i].serialno === serialno) {
			return clients[i];
		}
	}
};

/**
 * 根据clientId获取client
 * @param clientId
 * @returns {*}
 */
exports.getByClientId = function(clientId) {
	if(clients.length > 0) {
		for (var i = 0; i < clients.length; i++) {
			if (clients[i].clientId === clientId) {
				return clients[i];
			}
		}
	}
	return null;
};

/**
 * 发送数据
 * @param ipAddress
 * @param bytes
 */
exports.send = function (clientId, bytes) {
	for (var i = 0; i < clients.length; i++) {
		if (clients[i].clientId === clientId) {
			var sock = clients[i].sock;
			if (sock !== null) {
				sock.write(new Buffer(bytes));
			}
		}
	}
};

/**
 * 对所有控制器发送数据
 * @param bytes
 */
exports.sendAll = function (bytes) {
	for (var i = 0; i < clients.length; i++) {
		var sock = clients[i].sock;
		if (sock !== null) {
			sock.write(new Buffer(bytes));
		}
	}
};

/**
 * 返回当前在线中控数量
 * @returns {Number}
 */
exports.size = function () {
	return clients.length;
};

/**
 * 测试用
 */
exports.debug = function() {
	for (var i = 0; i < clients.length; i++) {
		var sock = clients[i].sock;
		console.log(clients[i].clientId + ":" + clients[i].code + ":" + clients[i].serialno);
	}
};

/**
 * 更新serialno
 * @param clientId
 * @param serialno
 */
exports.setSerialno = function(clientId, serialno) {
	for (var i = 0; i < clients.length; i++) {
		if (clients[i].clientId === clientId) {
			clients[i].setSerialno(serialno);
		}
	}
};

/**
 * 移除某一个client
 * @param clientId
 * @returns {string}
 */
exports.remove = function (clientId) {
	if(clients.length > 0) {
		var serialno = "";
		var needClear;
		for (var i = 0; i < clients.length; i++) {
			if (clients[i].clientId === clientId) {
				serialno = clients[i].serialno;
				if(!!clients[i].sock) {
					clients[i].sock.destroy();
				}
				needClear = i;
			}
		}
		if(!!needClear) {
			var temp = [];
			for(var j=0;j<clients.length;j++) {
				if(j !== needClear) {
					temp.push(clients[j]);
				}
			}
			clients = temp;
		}
		return serialno;
	}
};
