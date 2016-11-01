var mongoose = require('../mongoose.js');
var CenterBoxSchema = new mongoose.Schema({
	userMobile: String,
	serialno: String,
	ssid: String,
	passwd: String,
	code: String,
	hasConnected: {type: Boolean, default: false},
	regTime: {type: Date, default: Date.now},
	lastLoginTime: Date,
	isOnline: Boolean,
	temeratureSwitch: String,
	humiditySwitch: String,
	qualitySwitch: String,
	coSwitch: String,
	pm25Switch: String,
	curIpAddress: String,
	curPort: Number,
	onlineConfirmed : {type:Boolean, default:false}
});
var CenterBoxModel = mongoose.model("centerBox", CenterBoxSchema);

exports.updateIp = function (serialno, ipAddress, port, cb) {
	CenterBoxModel.update({serialno: serialno}, {
		$set: {
			curIpAddress: ipAddress,
			curPort: port,
			isOnline : true,
			lastLoginTime: Date.now()
		}
	}, function (err, updateResult) {
		if(err) {
			cb(err);
		} else {
			cb(null);
		}
	});
};

exports.updateIpAndCode = function(serialno, code, ipAddress, port, cb) {
	CenterBoxModel.update({serialno:serialno}, {
		$set: {
			curIpAddress: ipAddress,
			curPort: port,
			isOnline : true,
			lastLoginTime: Date.now(),
			code : code
		}
	}, function (err, updateResult) {
		if(err) {
			cb(err);
		} else {
			cb(null);
		}
	});
};

exports.getMaxCode = function (cb) {
	CenterBoxModel.find({}, null, {sort: {code: -1}, limit: 1}, function (err, docs) {
		if (err) console.log(err);
		else {
			if (docs.length === 0) {
				cb('0001');
			} else if (docs.length !== 1) {
				console.log('数据错误');
			} else {
				var code = docs[0].code;
				if (!code) {
					cb('0001');
				} else {
					var codeInt = parseInt(code.substr(0, 2), 16) * 16 + parseInt(code.substr(2, 2), 16);
					var nextCode = codeInt + 1;
					if (nextCode <= 0 || nextCode >= 16 * 16 * 16 * 16) {
						// TODO 不够用了
						return null;
					}
					var hByte = Math.floor(nextCode / 256).toString(16);
					var lByte = (nextCode % 256).toString(16);
					if (hByte.length === 1) {
						hByte = '0' + hByte;
					}
					if (lByte.length === 1) {
						lByte = '0' + lByte;
					}
					cb(hByte + "" + lByte);
				}
			}
		}
	});
};

exports.offline = function(serialno, cb) {
	CenterBoxModel.update({serialno:serialno}, {$set:{isOnline:false}}, function(err) {
		if(err) {
			console.log(err);
		}
	});
};

exports.exist = function (serialno, cb) {
	CenterBoxModel.findOne({"serialno": serialno}, function (err, centerBox) {
		if (err) {
			cb(err);
		} else {
			if(centerBox) {
				cb(null, true, centerBox);
			} else {
				cb(null, false);
			}
		}
	});
};


// exports.save = function (serialno, code) {
// 	CenterBoxModel.find({"serialno": serialno}, function (error, docs) {
// 		if (error) {
// 			console.log("CenterBoxModel.prototype.find: error : " + error);
// 		} else {
// 			console.log(JSON.stringify(docs));
// 			if (docs.length === 0) {
// 				// 数据库中不存在数据，插入数据
// 				var CenterBoxEntity = new CenterBoxModel({
// 					serialno: serialno,
// 					code: code
// 				});
//
// 				CenterBoxEntity.save(function (error, doc) {
// 					if (error) {
// 						console.log("CenterBoxEntity.prototype.save: error : " + error);
// 					} else {
// 						var saveMsg = "新增centerBox保存成功";
// 						console.log(saveMsg);
// 						// sock.write(saveMsg);
// 					}
// 				});
// 			} else {
// 				// 数据库中已经有记录了，修改该上下线状态，修改最后登录时间
// 				var conditions = {"serialno": serialno};
// 				var update = {$set: {lastLoginTime: new Date(), 'code': code, isOnline:true}};
// 				CenterBoxModel.update(conditions, update, function (error) {
// 					if (error) {
// 						console.log("CenterBoxModel.prototype.update: error : " + error);
// 					} else {
// 						var saveMsg = "更新最后登录时间成功";
// 						console.log(saveMsg);
// 						// sock.write(saveMsg);
// 					}
// 				});
// 			}
// 		}
// 	});
// };
