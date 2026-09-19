import { LooseObject } from '../shared/index'

const _ = require('lodash')

interface ItemsDefine {
  type: string
}

interface JsonSchemaInterface {
  "type": string
  "items"?: ItemsDefine | ItemsDefine[],
  [key: string]: any
}

type JsonSchemaMuiltyInterface = Array<JsonSchemaInterface>

type JsonType = JsonSchemaMuiltyInterface | JsonSchemaInterface | undefined

export const getEmitSchema = function (tsType: string, emitHandlerName: string, payloadParams: any[], __SchemaWordbook: LooseObject) {
  const validMethodName = emitHandlerName.replace(/[^a-zA-z0-9]/img, '_')
  const tsVariableName = _.uniqueId(`__method_${validMethodName}_return_TsType_`)
  return {
    [emitHandlerName]: {
      schema: tsType2JsonSchema(tsVariableName, tsType, ':', __SchemaWordbook),
      // label: `TODO:注释 [@Emit: ${emitHandlerName}]`,
      payload: getMetodPayloadList(validMethodName, payloadParams, __SchemaWordbook)
    }
  }
}

export const getPropSchema = function (tsType: string, defaultValue: string, propName: string, __SchemaWordbook: LooseObject) {

  function evil(expression: string): any {
    try {
      var Fn = Function;
      return new Fn('return ' + expression)();
    } catch (e) {
      console.error(`[Error] tsType2JsonSchema.ts 默认值解析错误: ${expression}`)
      return undefined
    }
  }

  function getDefault(expression: string) {
    let obj = {}
    const returnVal = evil(expression)
    if (typeof returnVal === 'object' && returnVal.hasOwnProperty('default')) {
      let defVal
      const returnDefaultType = typeof returnVal.default
      switch (returnDefaultType) {
        case 'function':
          defVal = returnVal.default()
          break;
        default:
          defVal = returnVal.default
          break;
      }
      obj = {
        default: defVal
      }
    }
    return obj
  }

  const tsVariableName = _.uniqueId(`__prop_${propName}_TsType_`)
  return {
    [propName]: {
      schema: tsType2JsonSchema(tsVariableName, tsType, ':', __SchemaWordbook),
      ...getDefault(defaultValue)
    }
  }
}

function getMetodPayloadList(validMethodName: string, payloadParams: any[], __SchemaWordbook: LooseObject) {
  return payloadParams.map((item: string) => {
    const splitChar = '@__*__@';
    const [key, varSymbol, keyType] = item.replace(/\s/img, '').replace(/(.+?)([?!]?[:=]+)(.+)/img, `$1${splitChar}$2${splitChar}$3`).split(splitChar)
    const isRequired = key.indexOf('?') === -1
    const varKey = key.replace(/\?|\!/img, '')
    const tsVariableName = _.uniqueId(`__method_${validMethodName}_payload_${varKey}_TsType_`)
    return {
      key: varKey,
      schema: tsType2JsonSchema(tsVariableName, keyType, varSymbol, __SchemaWordbook),
      label: varKey,
      required: isRequired
    }
  })
}

// gui提供可选返回参数： 布尔、数字、字符串、数组、对象、方法
function tsType2JsonSchema(tsVariableName: string, tsType: string, tsExpression = ':', __SchemaWordbook: LooseObject): JsonType {

  // 动态创建的变量，以下类型的解析会导致数据异常
  let type = ['void', 'never'].indexOf(tsType) !== -1 ? 'any' : tsType

  __SchemaWordbook[tsVariableName] = {
    tsType: type,
    tsExpression
  }


  return {
    "type": type,
    tsVariableName
  }
}

