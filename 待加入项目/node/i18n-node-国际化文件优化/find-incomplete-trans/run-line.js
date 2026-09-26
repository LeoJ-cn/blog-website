// 文案key 铺平

const fs = require('fs')
const lodash = require('lodash')

const getFileTypeRegExp = () => new RegExp('.*\\.(.+)$', 'ig')
const replaceJSTypeRegExp = () => new RegExp('\\s*export\\s+default\\s*', 'ig')
const replceJSONTypeRegExp = () => new RegExp('^\\s*', 'ig')
const moduleExports = 'module.exports = '
const folderName = 'line-keys'

const config = require('./read-config.js')
const originTransPath = './transfer-station.js'
let transferStationFile = originTransPath // 导出变量的文件
let count = 0

//检查文件夹
if (!fs.existsSync(folderName)) {
  fs.mkdirSync(folderName)
}

function json2Properties(properties, jsonObj, initStr) {
  var key
  var newKey
  for (key in jsonObj) {
    newKey = initStr ? `${initStr}.${key}` : key
    if (typeof jsonObj[key] === 'object') {
      properties = json2Properties(properties, jsonObj[key], newKey)
    } else {
      properties[newKey] = jsonObj[key]
    }
  }
  return properties
}

for (var i = 0; i < config.length; i++) {
  const readFileList = config[i].translations

  const readCacheList = new Array(readFileList.length)

  const noTranslationList = []

  const transCache = {
    cn: {},
    de: {},
    en: {},
    jp: {},
    tw: {},
  }

  const questions = {}
  const countryList = ['cn', 'en', 'jp']

  let wirteFilePath
  for (let currentLang in readFileList) {
    const langReadList = readFileList[currentLang]
    for (var k = 0; k < langReadList.length; k++) {
      const readFilePath = langReadList[k]
      let content = fs.readFileSync(readFilePath, 'utf-8')
      const fileType = readFilePath.replace(getFileTypeRegExp(), '$1') //return: js or json
      const contentReplaceType = fileType === 'js' ? replaceJSTypeRegExp() : replceJSONTypeRegExp()
      content = content.replace(contentReplaceType, moduleExports)
      try {
        fs.writeFileSync(transferStationFile, content, 'utf8')
      } catch (err) {
        console.error(`${readFilePath}: Write Error!`)
      }
      readCacheList[k] = require(transferStationFile)
      // PS:require 同名缓存, 需要重命名
      const newPath = transferStationFile.replace(/transfer-station/i, `transfer-station${count}`)
      fs.renameSync(transferStationFile, newPath)
      transferStationFile = newPath
      count++

      wirteFilePath = readFilePath
    }
    const updatedFileContent = lodash.merge({}, ...readCacheList)
    transCache[currentLang] = json2Properties({}, updatedFileContent, '')
    // let wirteFilePath = `${folderName}/${config[i].module}.json`;
    // wirteFilePath = wirteFilePath.replace('insights-insights','insights-new');
    try {
      fs.writeFileSync(wirteFilePath, JSON.stringify(transCache[currentLang], null, 4), 'utf8')
      console.log(`${wirteFilePath}: File has been updated~~~~`)
    } catch (err) {
      console.log(`${wirteFilePath}: An error occured while writing JSON Object to File.`)
    }
  }
}

fs.renameSync(transferStationFile, originTransPath)
