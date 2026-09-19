const fs = require('fs');
const config = require("./sort-config.js");

var sortJson = function (obj) {
    var endValue, item, key, keyArray, keyArray2, o, _i, _len;
    endValue = {};
    keyArray = [];
    keyArray2 = [];
    for (key in obj) {
        o = {};
        o[key] = obj[key];
        keyArray.push(key);
    }
    keyArray2 = keyArray.sort();
    for (_i = 0, _len = keyArray2.length; _i < _len; _i++) {
        item = keyArray2[_i];
        const updateValue = obj[item];
        endValue[item] = typeof updateValue === 'object' ? sortJson(updateValue) : updateValue;
    }
    return endValue;
};

for (var i = 0; i < config.length; i++) {
    const wirteFilePath = config[i].beforeSortFiles[0];
    const readFileList = config[i].afterSortFile;

    const readFilePath = readFileList;
    let i18nData = require(readFilePath)
    i18nData = sortJson(i18nData);

    try {
        fs.writeFileSync(wirteFilePath, JSON.stringify(i18nData, null, 4), 'utf8');
        console.log(`${wirteFilePath}: File has been updated~~~~`);
    } catch (err) {
        console.log(`${wirteFilePath}: An error occured while writing JSON Object to File.`);
    }
}



