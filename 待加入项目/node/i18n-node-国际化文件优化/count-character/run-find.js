const fs = require('fs');
const lodash = require('lodash');

const folderName = 'i18ns';
const resultFolderName = 'result';
const resultFile = `${resultFolderName}/result.json`;

const config = require('./read-config.js');

//检查文件夹
if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
}
if (!fs.existsSync(resultFolderName)) {
    fs.mkdirSync(resultFolderName);
}

let i18nCnText = '';

// json key 铺平
function json2Properties(properties, jsonObj, initStr) {
    var key;
    var newKey;
    for (key in jsonObj) {
        newKey = initStr ? `${initStr}.${key}` : key;
        if (typeof jsonObj[key] === 'object') {
            properties = json2Properties(properties, jsonObj[key], newKey);
        } else {
            properties[newKey] = jsonObj[key];
        }
    }
    return properties;
}


for (var i = 0; i < config.length; i++) {
    const readFiles = config[i].translations;
    const wirteFilePath = `${folderName}/${config[i].module}.json`;
    let readContent = require(readFiles.cn[0]);
    readContent = json2Properties({}, readContent, '');

    lodash.forEach(readContent, value => {
        if (value.indexOf('@:') === -1){
            i18nCnText += value;
        }
    });

    try {
        fs.writeFileSync(wirteFilePath, JSON.stringify(readContent, null, 4), 'utf8');
        console.log(`${wirteFilePath}: File has been updated~~~~`);
    } catch (err) {
        console.log(`${wirteFilePath}: An error occured while writing JSON Object to File.`);
    }
}
const data = {
    length: i18nCnText.length,
    i18nCnText
}
try {
    fs.writeFileSync(resultFile, JSON.stringify(data, null, 4), 'utf8');
    console.log(`${resultFile}:Result is done ~~~~`);
} catch (err) {
    console.log(`${resultFile}:Result Error!!!`);
}

