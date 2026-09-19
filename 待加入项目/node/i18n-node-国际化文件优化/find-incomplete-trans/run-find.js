// 对比各种语言翻译： 找出没有翻译的语言

const fs = require('fs');
const lodash = require('lodash');

const getFileTypeRegExp = () => new RegExp('.*\\.(.+)$', 'ig');
const replaceJSTypeRegExp = () => new RegExp('\\s*export\\s+default\\s*', 'ig');
const replceJSONTypeRegExp = () => new RegExp('^\\s*', 'ig');
const moduleExports = 'module.exports = ';
const folderName = 'i18n-check-result';

const config = require('./read-config.js');
const originTransPath = './transfer-station.js';
let transferStationFile = originTransPath; // 导出变量的文件
let count = 0;


//检查文件夹
if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
}

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
    const readFileList = config[i].translations;
    let wirteFilePath = `${folderName}/${config[i].module}.json`;
    const readCacheList = new Array(readFileList.length);

    const noTranslationList = [];

    const transCache = {
        cn: {},
        de: {},
        en: {},
        jp: {},
        tw: {}
    };

    const questions = {};
    const countryList = ['cn', 'de', 'en', 'jp', 'tw'];

    for (let currentLang in readFileList) {
        const langReadList = readFileList[currentLang];
        for (var k = 0; k < langReadList.length; k++) {
            const readFilePath = langReadList[k];
            let content = fs.readFileSync(readFilePath, 'utf-8');
            const fileType = readFilePath.replace(getFileTypeRegExp(), '$1'); //return: js or json
            const contentReplaceType = fileType === 'js' ? replaceJSTypeRegExp() : replceJSONTypeRegExp();
            content = content.replace(contentReplaceType, moduleExports);
            try {
                fs.writeFileSync(transferStationFile, content, 'utf8');
            } catch (err) {
                console.error(`${readFilePath}: Write Error!`);
            }
            readCacheList[k] = require(transferStationFile);
            // PS:require 同名缓存, 需要重命名
            const newPath = transferStationFile.replace(/transfer-station/i, `transfer-station${count}`);
            fs.renameSync(transferStationFile, newPath);
            transferStationFile = newPath;
            count++;
        }
        const updatedFileContent = lodash.merge({}, ...readCacheList);
        transCache[currentLang] = json2Properties({}, updatedFileContent, '');
    }

    lodash.forEach(transCache, (value, language) => {
        if (lodash.isEmpty(value)) {
            noTranslationList.push(language);
        }
    });
    if (noTranslationList.length) {
        questions['000-No-Translation-List'] = noTranslationList;
        wirteFilePath = wirteFilePath.replace(/\.json/ig, `__lost-${noTranslationList.join('-')}.json`);
    }

    const allKeysObject = lodash.merge({}, transCache.cn, transCache.de, transCache.en, transCache.jp, transCache.tw);
    const allKeys = Object.keys(allKeysObject);


    //check
    lodash.forEach(allKeys, keyPath => {
        let hasAllTrans = true;
        const otherTranslations = {};
        const lost = [];
        const checkTranslation = {
            cn: null,
            de: null,
            en: null,
            jp: null,
            tw: null
        };
        lodash.forEach(countryList, language => {
            const currentTrans = transCache[language];
            checkTranslation[language] = lodash.get(currentTrans, keyPath, null);
        });
        lodash.forEach(checkTranslation, (value, language) => {
            if (value === null && noTranslationList.indexOf(language) === -1) {
                lost.push(language);
                hasAllTrans = false;
            } else {
                if (value !== null) {
                    otherTranslations[language] = value;
                }
            }
        });
        if (!hasAllTrans) {
            questions[keyPath] = {
                lost,
                otherTranslations,
            };
        }
    });


    try {
        fs.writeFileSync(wirteFilePath, JSON.stringify(questions, null, 4), 'utf8');
        console.log(`${wirteFilePath}: File has been updated~~~~`);
    } catch (err) {
        console.log(`${wirteFilePath}: An error occured while writing JSON Object to File.`);
    }
}

fs.renameSync(transferStationFile, originTransPath);
