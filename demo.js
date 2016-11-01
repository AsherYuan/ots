var CenterBoxModel = require('./mongodb/models/CenterBoxModel');

CenterBoxModel.exist('38ffd905474633322653043', function (flag, centerBox) {
    // TODO
    console.log(flag + "::::" + JSON.stringify(centerBox));

});
