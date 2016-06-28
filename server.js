/**
 *   完成对红外转发设备相互沟通的数据信息转化
 *   1 数据通信
 *   2 初始化流程
 */
var commandDecoder = require('./commandDecoder.js');
var Protocol = require('./protocol.js');
var Transponder = require('./transponder.js');
var OnlineClients = require('./OnlineHolder.js');
var net = require ('net');
var CenterBoxModel = require('./mongodb/models/CenterBoxModel');
var TerminalModel = require('./mongodb/models/TerminalModel.js');

// 在线的所有客户端的列表
var HOST = '121.40.53.201';
// var HOST = '127.0.0.1';
var PORT = 1000;
var server = net.createServer();
server.listen(PORT, HOST);

setInterval(function() {
    OnlineClients.refreshClients();
}, 30000);

server.on('connection', function(sock) {
    sock.setEncoding('binary');
    var ipAddress = sock.remoteAddress;
    var port = sock.remotePort;

    console.log('控制器上线:ip地址' + sock.remoteAddress);

    if(!OnlineClients.exist(ipAddress)) {
        OnlineClients.add(ipAddress, '', sock);
    }

    // 发送到pomelo服务器
    Transponder.socket.sendMsg('connector.entryHandler.entry', {'uid':'socketServer'});

    // 处理所有控制器发送的消息
    sock.on('data', function(data) {

        var protocol = Protocol.parsing(data);

        // 心跳记录
        OnlineClients.heartbeat(ipAddress);

        var client = OnlineClients.getByIpAddress(ipAddress);

        // 控制器初次上线注册流程
        if(protocol.command === '1000') {
            var serialno = protocol.data;
            var receiver = protocol.receiver;

            CenterBoxModel.exist(serialno, function(flag, obj) {
                if(flag === true) {
                    var code = obj.code;
                    if(!! code) {
                        if(OnlineClients.exist(ipAddress)) {
                            OnlineClients.update(ipAddress, code, serialno);
                        } else {
                            OnlineClients.add(ipAddress, code);
                        }

                        // CenterBoxModel.save(obj.serialno, code);

                        // 应答上线注册
                        var answerBytes = Protocol.encode(receiver, '0000', '0006', '0001', '1000', code, protocol.checkCode);
                        sock.write(new Buffer(answerBytes));

                        // 通知POMELO有客户端连接进入
                        Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {'command':'1000', 'serialno':serialno, 'receiver':code, 'ipAddress':ipAddress, 'port':port});
                    } else {
                        CenterBoxModel.getMaxCode(function(newCode) {
                            if(OnlineClients.exist(ipAddress)) {
                                OnlineClients.update(ipAddress, newCode, serialno);
                            } else {
                                OnlineClients.add(ipAddress, newCode);
                            }

                            // CenterBoxModel.save(obj.serialno, newCode);

                            // 应答上线注册
                            var answerBytes = Protocol.encode(receiver, '0000', '0006', '0001', '1000', newCode, protocol.checkCode);
                            sock.write(new Buffer(answerBytes));

                            // 通知POMELO有客户端连接进入
                            Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {'command':'1000', 'serialno':serialno, 'receiver':newCode, 'ipAddress':ipAddress, 'port':port});
                        });
                    }
                }
            });


            // 终端上线通知
        } else if(protocol.command === '1001') {
            var type = protocol.data.substring(2);
            var code = protocol.data.substring(0, 2);
            setTimeout(function() {
                Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {'command':'1001', 'terminalCode':code, 'terminalType':type, 'ipAddress':ipAddress, 'serialno':client.serialno});
            }, 1000);

        } else if(protocol.command == '2000') {
            Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {'command':'2000', 'ipAddress':ipAddress, 'data':protocol.data, 'serialno':client.serialno});

        } else if(protocol.command == '2001') {
            Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {'command':'2001', 'ipAddress':ipAddress, 'data':protocol.data, 'serialno':client.serialno});

        } else if(protocol.command == '2002') {
            Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {'command':'2002', 'ipAddress':ipAddress, 'data':protocol.data, 'serialno':client.serialno});

        } else if(protocol.command == '3000') {
            Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {'command':'3000', 'ipAddress':ipAddress, 'data':protocol.data, 'serialno':client.serialno});

        } else if(protocol.command == '3007') {
            Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {'command':'3007', 'ipAddress':ipAddress, 'data':protocol.data, 'serialno':client.serialno});

            // 控制器数据提交
        } else if(protocol.command === '4000') {
            Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {'command':'4000', 'ipAddress':ipAddress, 'data':protocol.data, 'serialno':client.serialno});
        } else if(protocol.command === '4001') {
            Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {'command':'4001', 'ipAddress':ipAddress, 'data':protocol.data, 'serialno':client.serialno});
        }
    });

    // 处理客户端丢失事件
    sock.on('close', function(data) {
        var c = OnlineClients.getByIpAddress(ipAddress);
        console.log('CLOSED:' + ipAddress + ":" + port + "____data:" + data);
        OnlineClients.remove(ipAddress);
        // 通知POMELO有客户端连接进入
        Transponder.socket.sendMsg('connector.entryHandler.socketMsg', {'command':'999', 'ipAddress':ipAddress, 'port':port, 'serialno':c.serialno});
    });

    // 异常处理
    sock.on('error', function(data) {
        console.log('ERROR:' + data);
    });
});
