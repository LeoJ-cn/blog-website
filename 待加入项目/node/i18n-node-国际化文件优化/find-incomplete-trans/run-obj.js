// 将铺平的key， 反转成obj json

const fs = require('fs')
const lodash = require('lodash')

const getFileTypeRegExp = () => new RegExp('.*\\.(.+)$', 'ig')
const replaceJSTypeRegExp = () => new RegExp('\\s*export\\s+default\\s*', 'ig')
const replceJSONTypeRegExp = () => new RegExp('^\\s*', 'ig')
const moduleExports = 'module.exports = '
const folderName = 'obj-keys'

const config = [
  {
    translations: {
      cn: ['../../src/insights/insights-new/cn.json'],

      en: ['../../src/insights/insights-new/en.json'],
      jp: ['../../src/insights/insights-new/jp.json'],
    },
    module: 'ana-advanced-analysis',
  },
]
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

const properties2Json = function (jsonObj, propertyKey, propertyValue) {
  var childObj = {},
    keyPart,
    i,
    keyParts = propertyKey.split('.'),
    lenParts = keyParts.length

  for (i = 0; i < lenParts; i++) {
    keyPart = keyParts[i]

    if (i === lenParts - 1) {
      if (i === 0) {
        jsonObj[keyPart] = propertyValue
      } else {
        childObj[keyPart] = propertyValue
      }
      break
    }
    if (i === 0) {
      if (!jsonObj[keyPart]) {
        jsonObj[keyPart] = {}
      }
      childObj = jsonObj[keyPart]
    } else {
      if (!childObj[keyPart]) {
        childObj[keyPart] = {}
      }
      childObj = childObj[keyPart]
    }
  }

  return jsonObj
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

  for (let currentLang in readFileList) {
    const langReadList = readFileList[currentLang]
    for (var k = 0; k < langReadList.length; k++) {
      const readFilePath = langReadList[k]
      wirteFilePath = readFilePath
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

    // transCache[currentLang] = json2Properties({}, updatedFileContent, '');
    const obj = {}
    lodash.forEach(updatedFileContent, (value, key) => {
      properties2Json(obj, key, value)
    })

    // wirteFilePath = wirteFilePath.replace('todo-keys', 'obj-keys');
    try {
      fs.writeFileSync(wirteFilePath, JSON.stringify(obj, null, 4), 'utf8')
      console.log(`${wirteFilePath}: File has been updated~~~~`)
    } catch (err) {
      console.log(`${wirteFilePath}: An error occured while writing JSON Object to File.`)
    }
  }
}

fs.renameSync(transferStationFile, originTransPath)
