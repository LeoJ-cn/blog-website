import * as TJS from 'typescript-json-schema'
import { LooseObject } from '../shared/index'
import { getComments } from './ast'
import { cusLog, CustomProcess } from '../utils'

const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const resolve = path.resolve

/**
 * TODO:
 * 1. deepWalk 相关逻辑先不提取，功能调整频繁，功能稳定之后再优化
 */

export const parseSchema = async function (
  filePath: string,
  originalJsonSchema: LooseObject,
  schemaWordbook: LooseObject,
) {
  let legalTsxText
  const testFilePath = resolve(filePath)
  const newTsxPath = path.join(path.dirname(testFilePath), '__temporary__.tsx')

  // /**
  //  * 移除import from 语法, 并加载·import·依赖
  //  */
  // try {
  //   cusLog('依赖加载', '开始')
  //   legalTsxText = new CombineMultiFiles(testFilePath).mergedCode
  //   cusLog('依赖加载', '结束')
  // } catch (e) {
  //   // 回退方案
  //   const str = fs.readFileSync(testFilePath, 'utf8')
  //   legalTsxText = str.toString().replace(/import.*\sfrom.*['"];?/igm, '')
  // }

  const str = fs.readFileSync(testFilePath, 'utf8')
  legalTsxText = str.toString()

  // 动态注册变量的目的： 函数变量-数据类型分析
  const SchemaWordbookStr = Object.keys(schemaWordbook).reduce(function (pre, tsVariableName) {
    const { tsType, tsExpression } = schemaWordbook[tsVariableName]
    return `${pre}
      ${tsVariableName}${tsExpression} ${tsType};`
  }, '')
  legalTsxText = legalTsxText.replace(
    /(export.*?default.*?class.*?Vue.*?{)/i,
    `$1  \n ${SchemaWordbookStr} \n`,
  )

  /**
   * TODO:
   * fix 非法注释（@type等 临时解决方案）
   */
  legalTsxText = legalTsxText.replace(/\*\s*\@type/gim, '* @type_ss')

  try {
    fs.writeFileSync(newTsxPath, legalTsxText)
    delete require.cache[resolve(newTsxPath)]
  } catch (err) {
    console.log(err)
  }

  let commentsMap: LooseObject = {}
  try {
    cusLog('提取注释', '开始')
    commentsMap = getComments(newTsxPath)
    cusLog('提取注释', '结束')
  } catch (e) {
    console.log(new Error('[Error] 提取注释，出现异常'))
  }

  cusLog('schema类型分析', '开始')
  const settings: TJS.PartialArgs = {
    // required: true,

    /**
     * ref=false【不需要共享数据类型，每个字段直接分析出结果】
     * 优点： 不需要 getSchemaWithReplacedRef 处理替换 $ref 的真实定义
     * 问题： 循环定义的ts， 没有schema， 无法得到循环定义的ts类型; 同时会导致无法解析ts内置类型
     *
     * ref=true
     * 优点：解决false的问题
     * 问题：需要手动解析一次$ref的schema的定义
     */
    ref: true,
    ignoreErrors: true,
  }
  const compilerOptions: TJS.CompilerOptions = {
    // strictNullChecks: true,
  }
  const program = TJS.getProgramFromFiles(
    [newTsxPath],
    compilerOptions,
    // basePath
  )

  const compTag = originalJsonSchema.tag
  const baseData = TJS.generateSchema(program, '*', settings) as LooseObject

  const definedSchema = getTransformData(baseData, compTag)

  const propsSchema = _.get(definedSchema, `${compTag}.properties`, {})
  const getVarSchema = initGetVarSchema(definedSchema as LooseObject, compTag)

  /**
   * ts-ast-viewer插件的数据：
   * 更新 prop 数据： 数据类型以及注释
   */
  const { props, events } = originalJsonSchema

  /**
   * @Prop相关数据 ts-ast-view 分析
   * PS：
   *  1.ts-ast-view: 分析 @prop 默认值
   *  2.ts2jsonchema: 可以拿到ts类型定义以及 原子属性的定义和注释 【附加信息additionalProperties】
   **/
  Object.keys(props).forEach((propKey) => {
    const { default: defaultVal } = props[propKey] || {}

    const currentVarType = getVarSchema(propKey)
    const desc = currentVarType.description || propKey

    props[propKey] = _.merge(
      typeof defaultVal !== 'undefined' ? { default: defaultVal } : {},
      { schema: currentVarType },
      {
        label: desc,
        description: desc,
      },
    )
  })

  /**
   * @Emit
   * PS: 相关数据通过动态创建“__method_eventName_payload”的变量来分析 ！！！
   *  1.babel ast: 分析 @prop 顶层的注释
   *  2.ts2jsonchema:  可以拿到ts类型定义以及 原子属性的定义和注释 【附加信息additionalProperties】
   **/
  Object.keys(events).forEach((eventKey) => {
    const tsAstViewerEventJsonSchema = events[eventKey] || {}
    const currentVarType = getVarSchema(tsAstViewerEventJsonSchema.schema.tsVariableName)
    tsAstViewerEventJsonSchema.schema = currentVarType
    ;(tsAstViewerEventJsonSchema.payload || []).forEach((payloadItem: LooseObject) => {
      const currentVarType = getVarSchema(payloadItem.schema.tsVariableName)
      payloadItem.schema = currentVarType
    })

    const { __comment__ = `默认注释：@Prop-${eventKey}` } = commentsMap.events[eventKey]

    events[eventKey] = _.merge(tsAstViewerEventJsonSchema, {
      label: __comment__,
      description: __comment__,
    })
  })

  const josnWithLimitDesc = limitDescInfo({
    ...originalJsonSchema,
    props,
    events,
    slots: commentsMap.slots || [],
    // definitions: propsSchema
  } as LooseObject)

  fs.unlinkSync(newTsxPath)
  cusLog('schema类型分析', '结束')

  return josnWithLimitDesc
}

/**
 * 转译 $ref 指针
 * TODO: 这里性能非常差，极度占用时间！！！
 */
function getTransformData(definedSchema: LooseObject, tag: string): LooseObject {
  /**
   * 保留tag的类型定义
   * PS：需要先更新类型map
   */
  let tagProsSchema = _.get(definedSchema, `definitions.${tag}`, {})
  _.set(definedSchema, `definitions.${tag}`, {})

  /**
   * 更新类型map
   * 至少执行两次（保证第一层schema不会出现ref）:
   * 第一次执行：替换ref，清除第一层ref的指针
   * 第二次执行：ref指针类型也存在ref，就需要再次执行一次
   */
  const allschema = _.get(definedSchema, 'definitions')
  let allschemaWithReplaceRef = getSchemaWithReplacedRef(
    allschema,
    allschema,
    '替换 schema.$ref 指针:3-1',
  )
  allschemaWithReplaceRef = getSchemaWithReplacedRef(
    allschemaWithReplaceRef,
    allschemaWithReplaceRef,
    '替换 schema.$ref 指针:3-2',
  )

  /**
   * 更新tag的类型定义，并重写map
   */
  tagProsSchema = getSchemaWithReplacedRef(
    tagProsSchema,
    allschemaWithReplaceRef,
    '替换 schema.$ref 指针:3-3',
  )

  tagProsSchema = removeRefFromSchema(tagProsSchema, '移除 schema.$ref 指针:1-1')

  _.set(allschemaWithReplaceRef, `${tag}`, tagProsSchema)
  return allschemaWithReplaceRef
}

function initGetVarSchema(allschemaWithReplaceRef: LooseObject, tag: string) {
  return function (varName: string) {
    return _.get(allschemaWithReplaceRef, `${tag}.properties.${varName}`, {})
  }
}

/**
 * 铺平key，替换所有 xx.xxx.$ref 所属的 schema
 */
interface NeedReplaceObj {
  /**
   * path1.path2.path3.$ref
   */
  keyPath: string
  /**
   * #/definitions/${TypeName}
   */
  ref?: string
}

function getSchemaWithReplacedRef(
  oldSchema: LooseObject,
  defineMap: LooseObject,
  processTitle: string,
) {
  const newSchema = _.cloneDeep(oldSchema) // 防止循环引用
  const newDefineMap = _.cloneDeep(defineMap) // 防止循环引用

  /**
   * 防止key中出现包含字符串“.”, 更新会导致改变对象结构。
   * eg. {"key.something": '123'}
   */
  const keySplitSymbol = '-$__$-'
  const needReplaceKeyVal: NeedReplaceObj[] = []
  const deepWalk = (jsonObj: LooseObject, initStr: string) => {
    var key
    var newKey: string
    for (key in jsonObj) {
      newKey = initStr ? `${initStr}${keySplitSymbol}${key}` : key
      const curType = Object.prototype.toString
        .call(jsonObj[key])
        .replace(/\[object\s+(.*?)\]/gim, '$1')
      if (curType === 'Object') {
        deepWalk(jsonObj[key], newKey)
      } else if (curType === 'Array') {
        jsonObj[key].forEach((itemObj: LooseObject, index: number) => {
          deepWalk(itemObj, `${newKey}${keySplitSymbol}${index}`)
        })
      } else {
        if (newKey.indexOf('$ref') !== -1) {
          needReplaceKeyVal.push({
            keyPath: newKey,
            ref: jsonObj[key],
          })
        }
      }
    }
  }
  deepWalk(newSchema, '')

  let processLog: any = new CustomProcess({
    title: processTitle,
    width: 50,
    total: needReplaceKeyVal.length,
  })

  needReplaceKeyVal.forEach((item: NeedReplaceObj) => {
    const { keyPath, ref } = item

    const keyArr = keyPath.split(keySplitSymbol)
    keyArr.pop()
    const varPath = keyArr.reduce(function (pre, cur) {
      return pre ? `${pre}[\`${cur}\`]` : `[\`${cur}\`]`
    }, '')

    /**
     * 安全赋值: obj["a"]["b"]["c"] = val
     * 替换$ref 以及 合并数据
     * fix：$ref可能是非法指针，类似false，object
     */
    const refType = String(ref).replace(/.*\/(.+)/gim, '$1')
    const fSchema = newDefineMap[refType] || {}

    const updateSchemaFn = new Function(
      'schemaWordbook',
      'fSchema',
      '_',
      `
      const oldData = schemaWordbook${varPath}
      const newData = fSchema
      schemaWordbook${varPath} = _.merge({}, oldData, newData);
      delete schemaWordbook${varPath}.$ref;
    `,
    )
    updateSchemaFn(newSchema, fSchema, _)

    processLog.tick()
  })

  processLog.end()
  processLog = null

  return newSchema
}

/**
 *
 * 只需要删除 prop 以及 event内部的  $ref
 */
function removeRefFromSchema(oldSchema: LooseObject, processTitle: string) {
  const newSchema = _.cloneDeep(oldSchema) // 防止循环引用

  /**
   * 防止key中出现包含字符串“.”, 更新会导致改变对象结构。
   * eg. {"key.something": '123'}
   */
  const keySplitSymbol = '-$__$-'
  let needReplaceKeyVal: NeedReplaceObj[] = []

  const deepWalk = (jsonObj: LooseObject, initStr: string) => {
    var key
    var newKey: string
    for (key in jsonObj) {
      newKey = initStr ? `${initStr}${keySplitSymbol}${key}` : key
      const curType = Object.prototype.toString
        .call(jsonObj[key])
        .replace(/\[object\s+(.*?)\]/gim, '$1')
      if (curType === 'Object') {
        deepWalk(jsonObj[key], newKey)
      } else if (curType === 'Array') {
        jsonObj[key].forEach((itemObj: LooseObject, index: number) => {
          deepWalk(itemObj, `${newKey}${keySplitSymbol}${index}`)
        })
      } else {
        if (newKey.indexOf('$ref') !== -1) {
          needReplaceKeyVal.push({
            keyPath: newKey,
          })
        }
      }
    }
  }

  Object.keys(_.get(newSchema, 'properties', {})).forEach((topKey: string) => {
    /**
     * 性能优化:
     * 只分析prop和event相关的schema（__prop*  __method*）
     */
    if (/^__/.test(topKey)) {
      deepWalk(_.get(newSchema, `properties.${topKey}`, {}), `properties${keySplitSymbol}${topKey}`)
    }
  })

  let processLog: any = new CustomProcess({
    title: processTitle,
    width: 50,
    total: needReplaceKeyVal.length,
  })

  needReplaceKeyVal.forEach((item: NeedReplaceObj) => {
    const { keyPath } = item

    const keyArr = keyPath.split(keySplitSymbol)
    keyArr.pop()
    const varPath = keyArr.reduce(function (pre, cur) {
      return pre ? `${pre}[\`${cur}\`]` : `[\`${cur}\`]`
    }, '')

    /**
     * 删除 $ref
     */
    const updateSchemaFn = new Function('schemaWordbook', `delete schemaWordbook${varPath}.$ref;`)
    updateSchemaFn(newSchema)

    processLog.tick()
  })

  processLog.end()
  processLog = null

  return newSchema
}

/**
 * 限制 description 的信息，限制第一条注释
 */
function limitDescInfo(source: LooseObject) {
  const newSchema = _.cloneDeep(source)

  /**
   * 防止key中出现包含字符串“.”, 更新会导致改变对象结构。
   * eg. {"key.something": '123'}
   */
  const keySplitSymbol = '-$__$-'
  const needReplaceKeyVal: NeedReplaceObj[] = []
  const deepWalk = (jsonObj: LooseObject, initStr: string) => {
    var key
    var newKey: string
    for (key in jsonObj) {
      newKey = initStr ? `${initStr}${keySplitSymbol}${key}` : key
      const curType = Object.prototype.toString
        .call(jsonObj[key])
        .replace(/\[object\s+(.*?)\]/gim, '$1')
      if (key === 'description') {
        needReplaceKeyVal.push({
          keyPath: newKey,
        })
      }
      if (curType === 'Object') {
        deepWalk(jsonObj[key], newKey)
      } else if (curType === 'Array') {
        jsonObj[key].forEach((itemObj: LooseObject, index: number) => {
          deepWalk(itemObj, `${newKey}${keySplitSymbol}${index}`)
        })
      }
    }
  }
  deepWalk(newSchema, '')

  let processLog: any = new CustomProcess({
    title: '截取注释信息',
    width: 50,
    total: needReplaceKeyVal.length,
  })

  needReplaceKeyVal.forEach((item: NeedReplaceObj) => {
    const { keyPath } = item

    const keyArr = keyPath.split(keySplitSymbol)
    keyArr.pop()
    const varPath = keyArr.reduce(function (pre, cur) {
      return pre ? `${pre}[\`${cur}\`]` : `[\`${cur}\`]`
    }, '')

    const updateSchemaFn = new Function(
      'source',
      `
      var desc = source${varPath}['description'] || '';
      desc = String(desc).split('\\n')[0]
      source${varPath}['description'] = desc;
      if(source${varPath}['label']){
        source${varPath}['label'] = desc;
      }
    `,
    )

    updateSchemaFn(newSchema, source)

    processLog.tick()
  })

  processLog.end()
  processLog = null

  return newSchema
}
