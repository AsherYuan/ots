/**
 *   完成对红外转发设备相互沟通的数据信息转化
 *   1 数据通信
 *   2 初始化流程
 */
var net = require('net');
var Protocol = require('./protocol');
var Transponder = require('./transponder');
var OnlineClients = require('./OnlineHolder');
var CenterBoxModel = require('./mongodb/models/CenterBoxModel');
var TerminalModel = require('./mongodb/models/TerminalModel');

/**
 * 日志管理器
 * TODO 需要确认所有的文件中日志管理器是否会冲突，如果会，需要改成单例模式(已修改 2016-08-15 11:01:00)
 */
var logger = require('./logger');

/**
 * 服务器地址
 * @type {string}
 */
// var HOST = '121.40.172.233';
var HOST = '121.40.53.201';
// var HOST = "127.0.0.1";
var PORT = 1000;

/**
 * 创建TcpSocket服务器
 * TODO 稳定性问题，如何提升
 * @type {*|{listen}}
 */
var server = net.createServer();
server.listen(PORT, HOST);
logger.info('数据中转服务器启动完成:HOST:' + HOST + ":PORT:" + PORT);
logger.info("开始主服务器初始化连接过程...");

server.on('connection', function (sock) {
	sock.setEncoding('binary');
	var ipAddress = sock.remoteAddress;
	var port = sock.remotePort;
	logger.info("发生主控连接事件:ipAddress:" + ipAddress + ":port:" + port);

	// 开始与通知pomelo服务器
	Transponder.socket.sendMsg('connector.entryHandler.entry', {'uid': 'socketServer'});

	// 以ipAddress和port作为主键
	// 在线主控连接保持容器，由ipAddress和port来做区分
	var clientId = ipAddress + ":" + port;
	if (!OnlineClients.exist(clientId)) {
		OnlineClients.add(clientId, ipAddress, '', sock);
	}

	/**
	 * 连接超时事件，当timeout事件发生情况下，主动销毁client，并且移除在线列表
	 */
	sock.on('timeout', function() {
		var client = OnlineClients.getByClientId(clientId);
		if(!!client) {
			CenterBoxModel.offline(client.serialno);
			OnlineClients.remove(clientId);
			/**
			 * 通知主服务器某主控下线
			 */
			Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
				'command': '999',
				'ipAddress': ipAddress,
				'port': port,
				'serialno': client.serialno
			});
			logger.info("连接超时:ipAddress:" + ipAddress + ":port:" + port);
		}
	});

	/**
	 * 连接关闭事件，当close事件发生情况下，主动销毁client，并且移除在线列表
	 */
	sock.on('close', function() {
		console.log("==========异常close发生=================");
		OnlineClients.debug();
		var client = OnlineClients.getByClientId(clientId);
		if(!!client) {
			CenterBoxModel.offline(client.serialno);
			OnlineClients.remove(clientId);
			/**
			 * 通知主服务器某主控下线
			 */
			Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
				'command': '999',
				'ipAddress': ipAddress,
				'port': port,
				'serialno': client.serialno
			});
			logger.info("客户端连接关闭:ipAddress:" + ipAddress + ":port:" + port);
		}
	});


	/**
	 * 异常发生事件
	 */
	sock.on('error', function (error) {
		console.log("==========异常error发生=================");
		OnlineClients.debug();
		var client = OnlineClients.getByClientId(clientId);

		if(!!client) {
			CenterBoxModel.offline(client.serialno);
			OnlineClients.remove(clientId);
			/**
			 * 通知主服务器某主控下线
			 */
			Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
				'command': '999',
				'ipAddress': ipAddress,
				'port': port,
				'serialno': client.serialno
			});
			logger.info("连接发生异常:ipAddress:" + ipAddress + ":port:" + port);
			logger.error(JSON.stringify(error));
		}
	});


	/**
	 * 接收消息事件
	 */
	sock.on('data', function (data) {
		/**
		 * 解析数据，由嘉科定义的数据协议解析实际数据
		 */
		var protocol = Protocol.parsing(data);
		logger.info("接收到数据提交：" + JSON.stringify(protocol));
		/**
		 * 以周期性的数据发送视作为心跳机制，依赖于4000，主控上传感器数据的提交，进行模拟
		 * 当数据进入后，刷新该client在容器中的lasthbTime，来作为一个判断基础
		 */
		OnlineClients.heartbeat(clientId);
		var client = OnlineClients.getByClientId(clientId);
		// 控制器初次上线注册流程
		if (protocol.command === '1000') {
			var serialno = protocol.data;
			/**
			 * 根据clientId(ip:port),刷新在列表中的对应当前client所对应的中控的流水码serialno,以提供后续使用
			 */
			OnlineClients.setSerialno(clientId, serialno);

			/**
			 * 检测数据库中的中央控制器(根据序列码serialno)是否存在
			 * 如果不存在，不进行任何处理, 等待用户初始化
			 * 如果存在，则对CODE进行处理
			 */
			CenterBoxModel.exist(protocol.data, function (err, centerBox) {
				if(err) {
					// 处理数据库错误
					console.log(err);
				} else {
					console.log("=============================================主控是否存在?======================");
					console.log(JSON.stringify(centerBox));
					if(!!centerBox) {
						// 主控存在，刷新主控的Code和当前ip地址以及端口
						if(!!centerBox.code) {
							CenterBoxModel.updateIp(serialno, ipAddress, port, function(err) {
								if(err) {
									logger.error("updateIp>>>>>");
									logger.error(err);
								} else {
									var receiver = protocol.receiver;
									logger.info("存在已经初始化过的主控(serialno:" + serialno + "), 其code为:" + centerBox.code);
									var code = centerBox.code;
									OnlineClients.update(clientId, code, serialno);

									/**
									 * 应答上线注册
									 */
									var answerBytes = Protocol.encode(receiver, '0000', '0006', '0001', '1000', code, protocol.checkCode);
									console.log("-----111------------------------------------应答上线注册----------------" + receiver);
									sock.write(new Buffer(answerBytes));

									/**
									 * TODO pomelo端notify类型的请求不用返回
									 */
									Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
										'command': '1000',
										'serialno': serialno,
										'receiver': code,
										'ipAddress': ipAddress,
										'port': port
									});
								}
							});

							// 主控存在，但是Code不存在，设置Code
						} else {
							// 主控不存在
							CenterBoxModel.getMaxCode(function (newCode) {
								logger.info("存在未初始化主控上线，分配自动计算获得的code：" + newCode);
								OnlineClients.update(clientId, newCode, serialno);

								// 保存到数据库
								CenterBoxModel.updateIpAndCode(serialno, newCode, ipAddress, port, function(err) {
									if(err) {
										logger.error(err);
									} else {
										// 应答主控注册
										var answerBytes = Protocol.encode(protocol.receiver, '0000', '0006', '0001', '1000', newCode, protocol.checkCode);
										console.log("-----222------------------------------------应答上线注册----------------" + protocol.receiver);
										sock.write(new Buffer(answerBytes));

										Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
											'command': '1000',
											'serialno': serialno,
											'receiver': newCode,
											'ipAddress': ipAddress,
											'port': port
										});
									}
								});
							});
						}
					} else {
						// 主控不存在，忽略
					}
				}
			});
			// 终端上线通知
		} else if (protocol.command === '1001') {
			serialno = client.serialno;
			/**
			 * 类型暂时没有增加，等待嘉科@TODO
			 * @type {string}
			 */
			var type = protocol.data.substring(2);
			var code = protocol.data.substring(0, 2);
			TerminalModel.count({centerBoxSerialno:serialno, code:code}, function(err, count) {
				if(err) {
					console.log("终端查询报错::::" + JSON.stringify(err));
				}
				if(count === 0) {
					console.log("serialno:" + serialno);
					TerminalModel.findOne({centerBoxSerialno:serialno, code:null}, function(err, terminals) {
						if(err) {
							console.log(err);
							logger.info(err);
						} else {
							if(!!terminals) {
								TerminalModel.update({_id:terminals._id}, {$set:{isOnline:true, code:code, type:type}}, function(err, docs) {
									setTimeout(function () {
										Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
											'command': '1001',
											'terminalCode': code,
											'terminalType': type,
											'ipAddress': ipAddress,
											'serialno': client.serialno,
											'port': port
										});
									}, 1000);
								});
							}
						}
					});
				} else {
					TerminalModel.findOne({centerBoxSerialno:serialno, code:code}, function(err, terminals) {
						if(err) {
							console.log(err);
							logger.info(err);
						} else {
							if(!!terminals) {
								TerminalModel.update({_id:terminals._id}, {$set:{isOnline:true}}, function(err) {
									setTimeout(function () {
										Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
											'command': '1001',
											'terminalCode': code,
											'terminalType': type,
											'ipAddress': ipAddress,
											'serialno': client.serialno,
											'port': port
										});
									}, 1000);
								});
							}
						}
					});
				}
			});
		} else if (protocol.command == '2000') {
			Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
				'command': '2000',
				'ipAddress': ipAddress,
				'data': protocol.data,
				'serialno': client.serialno,
				'port': port
			});

		} else if (protocol.command == '2001') {
			Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
				'command': '2001',
				'ipAddress': ipAddress,
				'data': protocol.data,
				'serialno': client.serialno,
				'port': port
			});

		} else if (protocol.command == '2002') {
			TerminalModel.findOne({centerBoxSerialno:client.serialno, code:protocol.data.substring(0, 2)}, function(err, terminal) {
				if(err) console.log(err);
				else {
					if(!!terminal) {
						if(protocol.data.substring(2, 4) == "01") {
						} else {
							// terminalDownline(terminal);
						}
					}
				}
			});

		} else if (protocol.command == '2005') {
			var terminalCode = protocol.data.substring(0, 2);
			TerminalModel.findOne({centerBoxSerialno:client.serialno, code:terminalCode}, function(error, terminal) {
				if(error) {
					console.log(error);
				} else {
					if(!!terminal) {
						TerminalModel.update({_id:terminal._id}, {$set:{lastSensorDataTime:Date.now()}}, function(error, terminal) {
							Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
								'command': '2005',
								'ipAddress': ipAddress,
								'data': protocol.data,
								'serialno': client.serialno,
								'port': port
							});
						});
					}
				}
			});
		} else if (protocol.command == '3000') {
			Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
				'command': '3000',
				'ipAddress': ipAddress,
				'data': protocol.data,
				'serialno': client.serialno,
				'port': port
			});

		} else if (protocol.command == '3007') {
			Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
				'command': '3007',
				'ipAddress': ipAddress,
				'data': protocol.data,
				'serialno': client.serialno,
				'port': port
			});
		} else if (protocol.command == '3008') {
			Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
				'command': '3008',
				'ipAddress': ipAddress,
				'data': protocol.data,
				'serialno': client.serialno,
				'port': port
			});

		} else if (protocol.command === '4000') {
			Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
				'command': '4000',
				'ipAddress': ipAddress,
				'data': protocol.data,
				'serialno': client.serialno,
				'port': port
			});
		} else if (protocol.command === '4001') {
			Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
				'command': '4001',
				'ipAddress': ipAddress,
				'data': protocol.data,
				'serialno': client.serialno,
				'port': port
			});
		}
	});
});

/**
 * 服务器错误，记录日志
 */
server.on("error", function (error) {
	logger.error(JSON.stringify(error));
});

/**
 * 心跳检测(每30秒进行一次检测)
 */
setInterval(function () {
	OnlineClients.refreshClients();
}, 10000);

/**
 * 检查终端在线与否
 * 每分钟检查一次，检查10分钟没有数据的终端视为下线了
 */
// setInterval(function() {
// 	var clients = OnlineClients.getAll();
// 	for(var i=0;i<clients.length; i++) {
// 		var client = clients[i];
// 		TerminalModel.find({centerBoxSerialno:client.serialno}, function(err, terminals) {
// 			if(err) {
// 				console.log("err::" + JSON.stringify(err));
// 			} else {
// 				for(var j=0;j<terminals.length;j++) {
// 					if(!!terminals[j].code) {
// 						var answerBytes = Protocol.encode(client.code, '0000', '0005', '0001', '2002', terminals[j].code, '36FF');
// 						logger.debug("请求终端状态:" + client.code + ":::" + JSON.stringify(terminals[j].code));
// 						client.sock.write(new Buffer(answerBytes));
// 					}
// 				}
// 			}
// 		});
// 	}
// }, 10000);
//
// var terminalDownline = function(terminal) {
// 	// 永远在线
// 	TerminalModel.update({_id:terminal._id}, {$set:{isOnline:true}}, function(err) {
// 		if(err) console.log(err);
// 		else {
// 			Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {
// 				'command': '998',
// 				'serialno': terminal.centerBoxSerialno,
// 				'code': terminal.code
// 			});
// 		}
// 	});
// };
