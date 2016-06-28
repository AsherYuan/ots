exports.str2Hex = function(str) {
    var val = "";
    for(var i=0;i<str.length;i++) {
        if(val === '') {
            val = str.charCodeAt(i).toString(16);
        } else {
            val += "," + str.charCodeAt(i).toString(16);
        }
    }
    return val;
}

exports.str2Bytes = function(str) {
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

exports.trim = function(str) {
    var result = str;
    result = str.replace(/(^\s+)|(\s+$)/g,'');
	result = result.replace(/\s/g, '');
	return result;
}
