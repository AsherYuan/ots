var Client = function(ipAddress, code, sock) {
    var pub = {
        ipAddress:'',
        code:'',
        sock:null,
        lasthbTime:new Date().getTime(),
        serialno:'',
        setCode : function(code) {
            pub.code = code;
        },
        hb : function() {
            pub.lasthbTime = new Date().getTime();
        },
        setSerialno: function(serialno) {
            pub.serialno = serialno;
        }
    }
    //construct code
    pub.ipAddress = ipAddress;
    pub.code = code;
    pub.sock = sock;
    pub.lasthbTime = new Date().getTime();
    return pub;
};

var clients = [];

exports.refreshClients = function() {
    for(var i=0; i<clients.length; i++) {
        console.log(clients[i].ipAddress + ":" +new Date().getTime());
        console.log(clients[i].ipAddress + ":" +clients[i].lasthbTime);
        if(new Date().getTime() - clients[i].lasthbTime > 30000) {
            clients[i].sock.destroy();
        }
    }
};

exports.heartbeat = function(ipAddress) {
    for(var i=0; i<clients.length; i++) {
        if(clients[i].ipAddress === ipAddress) {
            clients[i].hb();
        }
    }
};

exports.add = function(ipAddress, code, sock) {
    var it = new Client(ipAddress, code, sock);
    clients.push(it);
};

exports.update = function(ipAddress, code, serialno) {
    for(var i=0; i<clients.length; i++) {
        if(clients[i].ipAddress === ipAddress) {
            clients[i].setCode(code);
            clients[i].setSerialno(serialno);
        }
    }
};

exports.remove = function(ipAddress) {
    for(var i=0; i<clients.length; i++) {
        if(clients[i].ipAddress === ipAddress) {
            clients.splice(i, 1);
        }
    }
};

exports.getByIpAddress = function(ipAddress) {
    for(var i=0; i<clients.length; i++) {
        if(clients[i].ipAddress === ipAddress) {
            return clients[i];
        }
    }
};

exports.exist = function(ipAddress) {
    for(var i=0; i<clients.length; i++) {
        if(clients[i].ipAddress === ipAddress) {
            return true;
        }
    }
    return false;
};

exports.send = function(ipAddress, bytes) {
    for(var i=0; i<clients.length; i++) {
        if(clients[i].ipAddress === ipAddress) {
            var sock = clients[i].sock;
            if(sock != null) {
                sock.write(new Buffer(bytes));
            }
        }
    }
};

exports.sendAll = function(bytes) {
    for(var i=0; i<clients.length; i++) {
        var sock = clients[i].sock;
        if(sock != null) {
            sock.write(new Buffer(bytes));
        }
    }
};

exports.size = function() {
    return clients.length;
};
