var commandDecoder = require('./commandDecoder.js');

var Protocol = function(sender, receiver, length, index, command, data, checkCode) {
    var pub = {
        sender:0,
        receiver:0,
        length:0,
        index:0,
        command:0,
        data:'',
        checkCode:0
    }
    //construct code
    pub.sender = sender;
    pub.receiver = receiver;
    pub.length = length;
    pub.index = index;
    pub.command = command;
    pub.data = data;
    pub.checkCode = checkCode;
    return pub;
};

var byteToStr = function(bHigh, bLow) {
    if(bHigh.length === 1) {
        bHigh = '0' + bHigh;
    }
    if(bLow.length === 1) {
        bLow = '0' + bLow;
    }
    return bHigh + bLow;
}

exports.parsing = function(hex) {
    hex = commandDecoder.str2Hex(hex);
    var byteArray = hex.split(',');
    var sender = byteToStr(byteArray[1], byteArray[0]);
    var receiver = byteToStr(byteArray[3], byteArray[2]);
    var length = byteToStr(byteArray[5], byteArray[4]);
    var index = byteToStr(byteArray[7], byteArray[6]);
    var command = byteToStr(byteArray[9], byteArray[8]);

    var data = '';
    var dataLength = parseInt(length, 16) - 4;
    for(var i=0;i<dataLength;i++) {
        var x = byteArray[i + 10];
        if(x.length === 1) {
            x = '0' + x;
        }
        data += x;
    }
    var checkCode = byteToStr(byteArray[byteArray.length - 1], byteArray[byteArray.length - 2]);
    return new Protocol(sender, receiver, length, index, command, data, checkCode);
};

exports.encode = function(sender, receiver, length, index, command, data, checkCode) {
    var byteL = receiver.substr(0, 2);
    var byteH = receiver.substr(2, 2);
    var command = reverse(sender) + reverse(receiver) + reverse(length) + reverse(index) + reverse(command) + data + reverse(checkCode);
    return commandDecoder.str2Bytes(command);
};

var reverse = function(bytes) {
    var byteL = bytes.substr(0, 2);
    var byteH = bytes.substr(2, 2);
    return byteH + byteL;
}
