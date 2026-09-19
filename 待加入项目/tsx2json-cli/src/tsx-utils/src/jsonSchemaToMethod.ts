import {
  Utils_Schema_Interface,
  Cli_RemoteConfig_Interface,
  Cli_ComponentEventPayload_Interface,
  Utils_ComponentEventPayload_Interface,
  LooseObject,
  Schema_Interface,
  Cli_ComponentJsonschema_Interface,
  Cli_ComponentProp_Interface,
  Utils_PropConfigListItem_Interface,
  Utils_SchemaToMethodCategory_Enum,
  Cli_ComponentEvent_Interface,
  Utils_EventConfigListItem_Interface,
  Utils_JsonSchemaToMethodReturn_Type,
} from './shared/index'
import _ from 'lodash'

export const jsonSchemaToMethod = function (
  JsonData: Cli_ComponentJsonschema_Interface,
): Utils_JsonSchemaToMethodReturn_Type {
  const _json = _.cloneDeep(JsonData)

  const { props = {}, events = {}, configs = {} } = _json

  return [...getPropConfig(props), ...getEmitConfig(events), getRemoteConfig(configs.remote_config)]
}

function getRemoteConfig(configs: Cli_RemoteConfig_Interface | undefined) {
  return configs || {}
}

function getPropConfig(props: Cli_ComponentProp_Interface) {
  const propConfigList: Utils_PropConfigListItem_Interface[] = []
  Object.keys(props).forEach((key: string) => {
    const { additionalProperties = {}, schema, label = '', default: deVal } = props[key]

    const defObj = typeof deVal === 'undefined' ? {} : { default: deVal }

    propConfigList.push({
      key,
      label,
      category: Utils_SchemaToMethodCategory_Enum.attr,
      schema: transformPayloadPropertiesAction(schema),
      ...defObj,
      isExoprt: true,
      additionalProperties,
    })
  })
  return propConfigList
}

function getEmitConfig(events: Cli_ComponentEvent_Interface) {
  const emitConfigList: Utils_EventConfigListItem_Interface[] = []

  Object.keys(events).forEach((key: string) => {
    const { additionalProperties = {}, label = '', payload } = events[key]

    emitConfigList.push({
      additionalProperties,
      key,
      label,
      category: Utils_SchemaToMethodCategory_Enum.event,
      task: {
        label: label || `事件名-${key}`,
        process: {
          type: 'bind_method',
          defaultMethods: [],
          custom_access: true,
        },
      },
      isExoprt: true,
      payload: transformPayloadProperties(payload),
    })
  })

  return emitConfigList
}

interface PropertiesList_Interface {
  /**
   * path1.path2.path3.properties
   * ||
   * path1.path2.path3.description
   */
  keyPath: string
}

function transformPayloadProperties(
  payload: Cli_ComponentEventPayload_Interface,
): Utils_ComponentEventPayload_Interface {
  let transformedPayload = _.cloneDeep(payload)
  return transformedPayload.map((item) => {
    return {
      ...item,
      schema: transformPayloadPropertiesAction(item.schema),
    }
  })
}

function transformPayloadPropertiesAction(
  payloadItemSchema: Schema_Interface,
): Utils_Schema_Interface {
  const keySplitSymbol = '-$__$-'
  const properties_needReplaceKeyVal: PropertiesList_Interface[] = []
  const description_needReplaceKeyVal: PropertiesList_Interface[] = []
  const deepWalk = (jsonObj: Schema_Interface, initStr: string) => {
    var key
    var newKey: string
    for (key in jsonObj) {
      newKey = initStr ? `${initStr}${keySplitSymbol}${key}` : key
      const curType = Object.prototype.toString
        .call(jsonObj[key])
        .replace(/\[object\s+(.*?)\]/gim, '$1')

      if (key === 'properties') {
        properties_needReplaceKeyVal.push({
          keyPath: newKey,
        })
      } else if (key === 'description') {
        description_needReplaceKeyVal.push({
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
  deepWalk(payloadItemSchema, '')

  description_needReplaceKeyVal.forEach((item: PropertiesList_Interface) => {
    const { keyPath } = item
    const keyArr = keyPath.split(keySplitSymbol)
    keyArr.pop()
    const varPath = keyArr.reduce(function (pre, cur) {
      return pre ? `${pre}[\`${cur}\`]` : `[\`${cur}\`]`
    }, '')

    /**
     * 安全赋值: obj["a"]["b"]["c"] = val
     * 根据description信息写入label
     * Fix: 注释包含英文引号会有问题，gui舞台导致，替换成其他字符
     */
    const updateSchemaFn = new Function(
      'payloadItemSchema',
      `
      var desc = payloadItemSchema${varPath}['description'] || '';
      desc = String(desc).replace(/['"]/img, ' ')
      payloadItemSchema${varPath}['description'] = desc;
      payloadItemSchema${varPath}['label'] = desc;
    `,
    )

    updateSchemaFn(payloadItemSchema)
  })

  /**
   * properties 对象转换成数组
   * PS： 倒序执行，优先转换内部的properties!!!
   */
  properties_needReplaceKeyVal.reverse().forEach((item: PropertiesList_Interface) => {
    const { keyPath } = item
    const keyArr = keyPath.split(keySplitSymbol)
    keyArr.pop()
    const varPath = keyArr.reduce(function (pre, cur) {
      return pre ? `${pre}[\`${cur}\`]` : `[\`${cur}\`]`
    }, '')

    /**
     * 安全赋值: obj["a"]["b"]["c"] = val
     * PS:默认schema.type， 修正在blockly中无法正常渲染的报错问题
     */
    const updateSchemaFn = new Function(
      'payloadItemSchema',
      `
      var _properties = payloadItemSchema${varPath}['properties'];
      _properties = typeof _properties === 'object' ? _properties:{};
      var new_properties = Object.keys(_properties).map(function (tsname) {
        var itemSchema = Object.assign(
          {},
          _properties[tsname],
          { key: tsname }
        )
        if(!itemSchema.type){
          itemSchema.type = 'string';
        }
        return itemSchema
      });
      payloadItemSchema${varPath}['properties'] = new_properties;
    `,
    )
    updateSchemaFn(payloadItemSchema)
  })

  return payloadItemSchema as Utils_ComponentEventPayload_Interface
}
