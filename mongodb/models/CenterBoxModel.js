var mongoose = require('../mongoose.js');
var CenterBoxSchema = new mongoose.Schema({
    serialno : { type:String },//设备序列号
    code : {type:String}, // 编码
    regTime : { type:Date, default:Date.now }, //首次注册时间
    lastLoginTime : { type:Date, default:Date.now }, // 最后登录时间
});
var CenterBoxModel = mongoose.model("centerBox", CenterBoxSchema);

exports.getMaxCode = function(cb) {
    CenterBoxModel.find({}, null, {sort:{code:-1}, limit:1}, function(err, docs) {
        if(err) console.log(err);
        else {
            if(docs.length === 0) {
                cb('0001');
            } else if(docs.length !== 1) {
                console.log('数据错误');
            } else {
                var code = docs[0].code;
                if(! code) {
                    cb('0001');
                } else {
                    var codeInt = parseInt(code.substr(0, 2), 16) * 16 + parseInt(code.substr(2, 2), 16);
                    var nextCode = codeInt + 1;
                    if(nextCode <= 0 || nextCode >= 16 * 16 * 16 * 16) {
                        // TODO 不够用了
                        return null;
                    }
                    var hByte = Math.floor(nextCode / 256).toString(16);
                    var lByte = (nextCode % 256).toString(16);
                    console.log(hByte + "______" + lByte);
                    if(hByte.length === 1) {
                        hByte = '0' + hByte;
                    }
                    if(lByte.length === 1) {
                        lByte = '0' + lByte;
                    }
                    cb(hByte + "" + lByte);
                }
            }
        }
    });
};

exports.exist = function(serialno, cb) {
    CenterBoxModel.find({"serialno":serialno}, function(err, docs) {
        if(err) console.log(err);
        else {
            if(docs.length === 0) {
                cb(false);
            } else {
                cb(true, docs[0]);
            }
        }
    });
};


exports.save = function(serialno, code) {
    CenterBoxModel.find({"serialno":serialno}, function(error, docs) {
        if(error) {
            console.log("CenterBoxModel.prototype.find: error : " + error);
        } else {
            console.log(JSON.stringify(docs));
            if(docs.length === 0) {
                // 数据库中不存在数据，插入数据
                var CenterBoxEntity = new CenterBoxModel({
                    serialno:serialno,
                    code:code
                });

                CenterBoxEntity.save(function(error,doc){
                    if(error) {
                        console.log("CenterBoxEntity.prototype.save: error : " + error);
                    } else {
                        var saveMsg = "新增centerBox保存成功";
                        console.log(saveMsg);
                        // sock.write(saveMsg);
                    }
                });
            } else {
                // 数据库中已经有记录了，修改该上下线状态，修改最后登录时间
                var conditions = {"serialno" : serialno};
                var update = {$set : { lastLoginTime : new Date(),'code' : code }};
                CenterBoxModel.update(conditions, update, function(error) {
                    if(error) {
                        console.log("CenterBoxModel.prototype.update: error : " + error);
                    } else {
                        var saveMsg = "更新最后登录时间成功";
                        console.log(saveMsg);
                        // sock.write(saveMsg);
                    }
                });
            }
        }
    });
};

