var Protobuf = require("pomelo-protobuf");
var Protocol = require('pomelo-protocol');
var net = require('net');
var Package = Protocol.Package;
var Message = Protocol.Message;
var EventEmitter = require('events').EventEmitter;
var commandDecoder = require('./commandDecoder.js');
var OnlineClients = require('./OnlineHolder.js');
var MyProtocol = require('./protocol.js');

var connected = false;
var firstMsgSended = false;

var params = {host:"121.40.53.201", port:"3010"};
// var params = {host:"192.168.1.73", port:"3010"};
var handshakeBuffer = {
    'sys': {type: 'socket', version: '0.0.1'},
    'user': {}
};
console.log('connect to ' + params.host + ":" + params.port);
var socket = new net.Socket();
socket.binaryType = 'arraybuffer';

socket.connect(params.port, params.host, function(){
    console.log('Connected ... ');
    var obj = Package.encode(Package.TYPE_HANDSHAKE, Protocol.strencode(JSON.stringify(handshakeBuffer)));
    socket.write(obj);
});

socket.on('data', function(data){
    var da = Package.decode(data);
    if(da.type == Package.TYPE_HANDSHAKE) {
      console.log('收到握手');
      var obj = Package.encode(Package.TYPE_HANDSHAKE_ACK);
      socket.write(obj);
    }

    if (da.type == Package.TYPE_DATA){
        console.log('收到数据');
        // receive response data

        var s = da.body.toString('utf-8');
        s = s.replace('onMsg', '');
        s = s.replace('{', '');
        s = s.replace('}', '');
        var array = s.split(',');

        var command = '';
        var ipAddress = '';
        var data = '';
        for(var i =0;i<array.length;i++) {
            if(array[i].indexOf('command') > 0) {
                var content = array[i].split(":")[1];
                command = content.replace("\"", '').replace("\"", '');
            } else if(array[i].indexOf('ipAddress') > 0) {
                var content = array[i].split(":")[1];
                ipAddress = content.replace("\"", '').replace("\"", '');
            } else if(array[i].indexOf('data') > 0) {
                var content = array[i].split(":")[1];
                data = content.replace("\"", '').replace("\"", '');
            }
        }

        // 设备状态查询
        if(command == '2000') {
            var client = OnlineClients.getByIpAddress(ipAddress);
            var answerBytes = MyProtocol.encode(client.code, '0000', '0004', '0001', '2000', '', '36FF');
            client.sock.write(new Buffer(answerBytes));
        } else if(command == '2001') {
            var client = OnlineClients.getByIpAddress(ipAddress);
            var answerBytes = MyProtocol.encode(client.code, '0000', '0004', '0001', '2001', '', '36FF');
            client.sock.write(new Buffer(answerBytes));
        } else if(command == '2002') {
            var client = OnlineClients.getByIpAddress(ipAddress);
            var answerBytes = MyProtocol.encode(client.code, '0000', '0005', '0001', '2002', data, '36FF');
            client.sock.write(new Buffer(answerBytes));

        } else if(command == '3000') {
            var client = OnlineClients.getByIpAddress(ipAddress);
            data = commandDecoder.trim(data);
            var answerBytes = MyProtocol.encode(client.code, '0000', '0033', '0001', '3000', data, '36FF');
            client.sock.write(new Buffer(answerBytes));
        } else if(command == '3007') {
            var client = OnlineClients.getByIpAddress(ipAddress);
            data = commandDecoder.trim(data);
            var answerBytes = MyProtocol.encode(client.code, '0000', '0008', '0001', '3007', data, '36FF');
            client.sock.write(new Buffer(answerBytes));
        }
    }
    if (da.type == Package.TYPE_HEARTBEAT){
        // 收到心跳，相应每3秒返回心跳
        // console.log('收到心跳');
        setTimeout(function() {
            var hb = Package.encode(Package.TYPE_HEARTBEAT);
            socket.write(hb);
        }, 3000);
    }
    if(da.type == Package.TYPE_KICK) {
      console.log("onKicked By Server");
    }
});

socket.on('error', function(data){
  console.log('onError:data:' + data);
});

socket.on('close', function(){
  console.log('onClose');
});

socket.sendMsg = function(route, obj) {
    var msg = Protocol.strencode(JSON.stringify(obj));
    msg = Message.encode(0, Message.TYPE_REQUEST, 0, route, msg);
    var packet = Package.encode(Package.TYPE_DATA, msg);
    socket.write(packet);
}

exports.socket = socket;
