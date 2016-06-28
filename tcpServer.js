/**
 主要完成SOCKETserver的启动和维持运行
*/
var pomelo = require('pomelo');
var net = require ('net');
var mongoose = require('./mongodb/mongoose.js');
var ControllersModel = require('./mongodb/models/ControllersModel.js');

var HOST = '121.40.53.201';
var PORT = 1000;

// 当前在线的客户端
// 目前的算法，按照注册时的IP地址进行保存入数据库(存入机器序列号，但服务器上以IP地址为识别)
var onlineClients = [];
// function
exports.start = function() {
    var server = net.createServer();
    server.listen(PORT, HOST);

    server.on('connection', function(sock) {
		var ipAddress = sock.remoteAddress;

        // 统一数据到内存中
        // TODO 未来统一性能问题，改造成memcached等，需要重新考虑
		var existInCache = false;
		for(var i=0; i<clients.length; i++) {
			if(ipAddress == clients[i].ipAddress) {
				existInCache = true;
			}
		}
		if(existInCache === false) {
			clients.push({ipAddress:ipAddress, sock:sock});
		}
		// ctrlsHandler.emitter.emit('connected');

        // 数据调整，当进入时候判断是否在数据库中，存入数据库
    	sock.on('data',function(data) {
			var command = data + "";
			// 命令发送
			if(command.substr(0, 12) === 'reservedFlag') {

				var targetIpAddress = command.substring(13, command.lastIndexOf(':'));
				var commandType = command.substring(command.lastIndexOf(':') + 1, command.lastIndexOf('&'));
				var tId = command.substr(command.lastIndexOf('&') + 1);
				for(var i=0;i<clients.length;i++) {
					if(clients[i].ipAddress == targetIpAddress) {
						var prefix = '21 02 00 00 30 00 01 00 00 30 ';
						var suffix1 = ' 36 FF 00 8A 22 A2 A2 A2 28 A2 88 88 88 A2 AA AA 22 2A 22 2A 88 80 1F E0 11 44 54 54 54 45 14 51 11 11 14 55 55 44 45 44 45 51 10 00 00'; // 18度
						var suffix2 = ' 36 FF 00 8A 22 A2 A2 A2 28 AA 22 22 22 22 AA A2 A2 A8 A2 28 88 80 1F E0 11 44 54 54 54 45 15 44 44 44 44 55 54 54 55 14 45 11 10 00 00'; // 24度
						if(commandType == '1') {
							clients[i].sock.setEncoding('binary');
							console.log('发送命令...' + prefix + tId + suffix1);
							var t1 = prefix + tId + suffix1;
							t1 = myTrim(t1);
							t1 = str2Bytes(t1);
							console.log(t1);
							clients[i].sock.write(new Buffer(t1));
						} else if(commandType == '2') {
							console.log('发送命令...' + prefix + tId + suffix2);
							var t2 = prefix + tId + suffix2;
							t2 = myTrim(t2);
							t2 = str2Bytes(t2);
							console.log(t2);
							clients[i].sock.write(new Buffer(t2));
						}
					}
				}
			} else {
				console.log('控制器中数据:' + data);
                ControllersModel.find({"ipAddress":ipAddress}, function(error, docs) {
    				if(error) {
    					console.log("ControllerChecker.prototype.find: error : " + error);
    				} else {
    				  if(docs.length === 0) {
    					// 数据库中不存在数据，插入数据
    					ControllersEntity = new ControllersModel({
    						ipAddress  : ipAddress,
    						online: true
    					});

    					ControllersEntity.save(function(error,doc){
    						if(error) {
    							console.log("ControllerChecker.prototype.save: error : " + error);
    						} else {
    							var saveMsg = "新增controller保存成功";
    							console.log(saveMsg);
    							// sock.write(saveMsg);
    						}
    						});
    					} else {
    						// 数据库中已经有记录了，修改该上下线状态，修改最后登录时间
    						var conditions = {ipAddress : ipAddress};
    						var update = {$set : { lastLoginTime : new Date(), online: true }};
    						ControllersModel.update(conditions, update, function(error) {
    							if(error) {
    								console.log("ControllerChecker.prototype.update: error : " + error);
    							} else {
    								var saveMsg = "更新最后登录时间成功";
    								console.log(saveMsg);
    								// sock.write(saveMsg);
    							}
    						});
    					}
    				}
    			});
			}
        });


        sock.on('close',function(data){
			if(sock.remoteAddress === '121.40.53.201') {

			} else {
				console.log('CLOSED:'+sock.remoteAddress +''+sock.remotePort);
	            // 控制器下线，修改数据库中状态
	            var ipAddress = sock.remoteAddress;
	            for(var i=0; i<clients.length; i++) {
	                if(ipAddress == clients[i].ipAddress) {
	                    clients.splice(i, 1);
	                }
	            }

	            var conditions = {ipAddress : ipAddress};
	            var update = {$set : { online: false }};
	            ControllersModel.update(conditions, update, function(error) {
	                if(error) {
	                    console.log("ControllerChecker.prototype.update: error : " + error);
	                } else {
	                    var saveMsg = "控制器下线，修改该状态";
	                    console.log(saveMsg);
	                }
	            });
			}
        });
    });
};

function stringToHex(str) {
	var val="";
	for(var i = 0; i < str.length; i++) {
		if(val === "") {
			val = str.charCodeAt(i).toString(16);
		} else {
			val += "," + str.charCodeAt(i).toString(16);
		}
	}
	return val;
}

function str2Bytes(str) {
	var pos = 0;
	var len = str.length;
	if(len % 2 !== 0) {
		return null;
	}
	len /= 2;
	var hexA = [];
	for(var i=0;i<len;i++) {
		var s = str.substr(pos, 2);
		var v = parseInt(s, 16);
		hexA.push(v);
		pos += 2;
	}
	return hexA;
}

function myTrim(str) {
	var result;
	result = str.replace(/(^\s+)|(\s+$)/g,'');
	result = result.replace(/\s/g, '');
	return result;
}
