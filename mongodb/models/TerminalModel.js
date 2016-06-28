var mongoose = require('../mongoose.js');
var TerminalSchema = new mongoose.Schema({
    code : { type:String },//编码
    regTime : { type:Date, default:Date.now }, //首次注册时间
    centerBoxCode : {type:String}
});
var TerminalModel = mongoose.model("terminal", TerminalSchema);

exports.save = function(code, centerBoxCode) {
    TerminalModel.find({"code":code, 'centerBoxCode':centerBoxCode}, function(error, docs) {
        if(error) {
            console.log("TerminalModel.prototype.find: error : " + error);
        } else {
            if(docs.length === 0) {
                // 数据库中不存在数据，插入数据
                var TerminalEntity = new TerminalModel({
                    code:code,
                    centerBoxCode:centerBoxCode
                });

                TerminalEntity.save(function(error,doc){
                    if(error) {
                        console.log("TerminalEntity.prototype.save: error : " + error);
                    } else {
                        var saveMsg = "新增centerBox保存成功";
                        console.log(saveMsg);
                        // sock.write(saveMsg);
                    }
                });
            }
        }
    });
};
