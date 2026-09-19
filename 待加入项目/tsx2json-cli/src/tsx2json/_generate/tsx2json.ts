import { initTs2Json, getFileDefinition } from '../index'
import { parseSchema } from './schema'
import { LooseObject } from '../shared/index'
import { cusLog, getBaseMsg } from '../utils'
import { generateGuiRemoteConfig } from './generateGuiRemoteConfig'
import { jsonSchemaToDef, Cli_ComponentJsonschema_Interface } from '../../tsx-utils'

const fs = require('fs')
const path = require('path')

export const tsx2json = async (filePath: string) => {
  const isTsx = path.extname(filePath) === '.tsx'
  if (!isTsx) {
    cusLog('检查', '跳过非tsx文件 ' + filePath)
    return
  }

  try {
    await initTs2Json()
  } catch {
    throw new Error(getBaseMsg('加载解析库初始化失败！！！'))
  }

  cusLog('Start')

  let baseFileFolderPath
  let fileCodeText
  let schemaObj: LooseObject
  let writeSchemaFile
  let schemaWordbook

  const fileBaseName = path.basename(filePath)

  try {
    baseFileFolderPath = path.dirname(filePath)
    cusLog('文本读取', '开始：' + fileBaseName)
    fileCodeText = fs.readFileSync(filePath, 'utf8')
    cusLog('文本读取', '结束：' + fileBaseName)
  } catch (e) {
    throw e
  }

  try {
    /**
     * 功能：（不分析注释, 不分析schema， 只获取定义文本）
     * 1. prop： name、数据类型、默认值
     * 2. emit： name、payload、return
     * 3. 创建数据类型的 表达式，然后在 parseSchema[schema.ts] 分析数据类型
     */
    cusLog('文件解析', '开始：' + fileBaseName)
    const { schema, __SchemaWordbook } = getFileDefinition(fileCodeText)
    schemaObj = schema
    schemaWordbook = __SchemaWordbook
    cusLog('文件解析', '结束：' + fileBaseName)
  } catch (e) {
    throw e
  }

  /**
   * 数据补全（以及额外附加信息）
   * 1.注释信息
   * 2.schema
   */
  try {
    cusLog('schema解析', '开始：' + fileBaseName)
    schemaObj = await parseSchema(filePath, schemaObj, schemaWordbook)
    cusLog('schema解析', '结束：' + fileBaseName)
  } catch (e) {
    throw e
  }

  /**
   * 自动生成远端配置以及依赖配置[个人项目不需要]
   */
  console.log(generateGuiRemoteConfig)
  // try {
  //   const remotesConfigs: LooseObject = generateGuiRemoteConfig(filePath, schemaObj.tag)
  //   Object.keys(remotesConfigs).forEach(configKey => {
  //     if (!schemaObj.configs) {
  //       schemaObj.configs = {}
  //     }
  //     schemaObj.configs[configKey] = remotesConfigs[configKey]
  //   })
  // } catch (e) {
  //   throw e
  // }

  try {
    writeFileWithMsgFn(`${baseFileFolderPath}/${schemaObj.tag}.schema.json`, schemaObj)
  } catch (e) {
    throw e
  }

  let analysisData
  try {
    analysisData = jsonSchemaToDef(schemaObj as Cli_ComponentJsonschema_Interface)
  } catch (e) {
    throw e
  }
  try {
    const { jsonSchemaToMethod, jsonSchemaToAtomComponent, jsonSchemaToOperationTree } =
      analysisData

    writeFileWithMsgFn(
      `${baseFileFolderPath}/${schemaObj.tag}.jsonSchemaToMethod.schema.json`,
      jsonSchemaToMethod,
    )
    writeFileWithMsgFn(
      `${baseFileFolderPath}/${schemaObj.tag}.jsonSchemaToAtomComponent.schema.json`,
      jsonSchemaToAtomComponent,
    )
    writeFileWithMsgFn(
      `${baseFileFolderPath}/${schemaObj.tag}.jsonSchemaToOperationTree.schema.json`,
      jsonSchemaToOperationTree,
    )
  } catch (e) {
    throw e
  }

  cusLog('End', '')
}

// 单个tsx文件解析
export const singleFile2json = async (filePath: string) => {
  tsx2json(filePath)
}

// 检测文件内所有的tsx文件
export const folderFiles2json = async (folderPath: string) => {
  fileDisplay(folderPath, tsx2json)
}

function writeFileWithMsgFn(file_path: string, source: LooseObject) {
  cusLog('新文件写入', '开始： ' + file_path)
  fs.writeFileSync(file_path, JSON.stringify(source, null, 4))
  cusLog('新文件写入', '结束： ' + file_path)
}

/**
 * 文件遍历方法
 */
function fileDisplay(filePath: string, fileCallBack: Function) {
  fs.readdir(filePath, function (err: any, files: any[]) {
    if (err) {
      console.warn(err, '读取文件夹错误！')
    } else {
      //遍历读取到的文件列表
      files.forEach(function (filename) {
        const filedir = path.join(filePath, filename)
        fs.stat(filedir, function (eror: any, stats: any) {
          if (eror) {
            console.warn('获取文件stats失败')
          } else {
            const isFile = stats.isFile()
            const isDir = stats.isDirectory()
            if (isFile) {
              fileCallBack(filedir)
            }
            if (isDir) {
              fileDisplay(filedir, fileCallBack)
            }
          }
        })
      })
    }
  })
}

export const tsx2jsonFromCli = function (config: any) {
  const { conversion, conversionAll } = config

  console.log('单个文件', conversion)
  console.log('目录下所有文件', conversionAll)
  if (!conversion && !conversionAll) {
    throw new Error(
      getBaseMsg(`没有检测到path！   示例如下：
      单个tsx文件  "gui tsx2json -c {文件绝对路径}" 
      检测文件下所有tsx文件 "gui tsx2json -ca {文件夹绝对路径}"
      `),
    )
  }

  conversion && singleFile2json(conversion)
  conversionAll && folderFiles2json(conversionAll)
}
