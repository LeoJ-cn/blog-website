// key 排序

const fs = require('fs')
const lodash = require('lodash')

const getFileTypeRegExp = () => new RegExp('.*\\.(.+)$', 'ig')
const replaceJSTypeRegExp = () => new RegExp('\\s*export\\s+default\\s*', 'ig')
const replceJSONTypeRegExp = () => new RegExp('^\\s*', 'ig')
const moduleExports = 'module.exports = '

const config = require('./sort-config.js')
const originTransPath = './transfer-station.js'
let transferStationFile = originTransPath // 导出变量的文件
let count = 0

const sortJson = function (obj) {
  var endValue, item, key, keyArray, keyArray2, o, _i, _len
  endValue = {}
  keyArray = []
  keyArray2 = []
  for (key in obj) {
    o = {}
    o[key] = obj[key]
    keyArray.push(key)
  }
  keyArray2 = keyArray.sort()
  for (_i = 0, _len = keyArray2.length; _i < _len; _i++) {
    item = keyArray2[_i]
    const updateValue = obj[item]
    endValue[item] = typeof updateValue === 'object' ? sortJson(updateValue) : updateValue
  }
  return endValue
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
  const readFileList = config[i].beforeSortFiles
  const wirteFilePath = config[i].afterSortFile
  const readCacheList = new Array(readFileList.length)

  for (var k = 0; k < readFileList.length; k++) {
    const readFilePath = readFileList[k]
    if (typeof readFilePath === 'string') {
      let content = fs.readFileSync(readFilePath, 'utf-8')
      const fileType = readFilePath.replace(getFileTypeRegExp(), '$1') //return: js or json
      const contentReplaceType = fileType === 'js' ? replaceJSTypeRegExp() : replceJSONTypeRegExp()
      content = content.replace(contentReplaceType, moduleExports)
      try {
        fs.writeFileSync(transferStationFile, content, 'utf8')
      } catch (err) {
        console.error(`${readFilePath}: Write Error!`)
        fs.renameSync(transferStationFile, originTransPath)
      }
      let i18nData = require(transferStationFile)
      i18nData = sortJson(i18nData)
      readCacheList[k] = i18nData
      // PS:require 同名缓存, 需要重命名
      const newPath = transferStationFile.replace(/transfer-station/i, `transfer-station${count}`)
      fs.renameSync(transferStationFile, newPath)
      transferStationFile = newPath
      count++
    }
  }

  const formatData = lodash.merge({}, ...readCacheList)

  try {
    fs.writeFileSync(wirteFilePath, JSON.stringify(formatData, null, 4), 'utf8')
    console.log(`${wirteFilePath}: File has been formatted~~~~`)
  } catch (err) {
    console.log(`${wirteFilePath}: An error occured while writing JSON Object to File.`)
    fs.renameSync(transferStationFile, originTransPath)
  }
}
fs.renameSync(transferStationFile, originTransPath)
