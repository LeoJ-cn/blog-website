import {
  Utils_JsonSchemaToAtomComponentReturn_Type,
  Utils_AtomComponentRenderContent_Interface,
  Utils_AtomComponentBox_Interface,
  Cli_ComponentJsonschema_Interface,
  LooseObject,
  getExportsList,
  getUuid
} from './shared/index'
import _ from 'lodash'

const generateAtomUuid = () => getUuid('atom')

export const jsonSchemaToAtomComponent = function (JsonData: Cli_ComponentJsonschema_Interface): Utils_JsonSchemaToAtomComponentReturn_Type {
  return [
    getAtomBoxEl(),
    getAtomContentEl(JsonData),
    ...getAtomSlotList(JsonData)
  ]
}

function getAtomBoxEl(): Utils_AtomComponentBox_Interface {
  return {
    "id": 0,
    "parentId": -1,
    "ins_id": generateAtomUuid(),
    "tag": "div",
    "data": {
      "$style": {
        "width": "100%"
      }
    }
  }
}

function getAtomContentEl(JsonData: Cli_ComponentJsonschema_Interface): Utils_AtomComponentRenderContent_Interface {
  const {
    tag,
    props
  } = JsonData

  const defaultDisplayText = `默认文本-${tag}`

  const exportsList: any[] = getExportsList(JsonData)
  const propDataMap: LooseObject = {}

  Object.keys(props).forEach(key => {
    const {
      default: deVal
    } = props[key];
    // 没有default，不需要配置参数
    if (typeof deVal !== 'undefined') {
      propDataMap[key] = deVal
    }
  })

  return {
    "id": 1,
    "parentId": 0,
    "ins_id": generateAtomUuid(),
    // 渲染tag，查找最小方法tag
    tag,
    "data": {
      "$default_value_locales": {
        "zh-CN": {
          "$text": defaultDisplayText
        },
        "en-US": {
          "$text": defaultDisplayText
        }
      },

      /**
       * TODO: 默认文本，button会使用，考虑放开方式（走注释配置）
       * $text
       */
      // "$text": defaultDisplayText,

      "$style": {},
      ...propDataMap,
      "$exports": [
        ...exportsList
      ],
      "$exportState": true
    },
    "children": []
  }
}

function getAtomSlotList(JsonData: Cli_ComponentJsonschema_Interface): LooseObject[] {

  const exportsList: any[] = getExportsList(JsonData)

  const {
    slots = []
  } = JsonData

  const defaultKey = 'default'
  let lists: LooseObject[] = _.isArray(slots) ? _.cloneDeep(slots) : []
  const defaultSlotIndex = _.findIndex(lists, { name: defaultKey })
  if (defaultSlotIndex !== -1) {
    const defaultItem = lists.splice(defaultSlotIndex, 1)
    lists.unshift(defaultItem)
  }

  const slotList: LooseObject[] = [];
  lists.forEach((item, index) => {
    const slotConfig = {
      "id": 2 + index,
      "parentId": 1,
      "ins_id": generateAtomUuid(),
      "tag": "GuiLayout",
      "data": {
        // "$slot": "content",  // default 不需要配置
        "overflow": "hidden",
        "$op": { "delete": 0 },
        "$style": {
          "height": "100%",
          "display": "flex",
          "flex-shrink": 0,
          "flex-direction": "row",
          "overflow-x": "hidden",
          "overflow-y": "hidden",
          "padding": "12px 0 12px 0"
        },
        "$exports": [
          ...exportsList
        ],
        "$pseudoClass": [
          {
            "key": "hover"
          }
        ],
        "$exportState": true
      },
      "$complexInfo": {
        "edit_page_uuid": "sal20000_org_key210207eaeomd6dgq"
      }
    }
    const slotsData = item.name === defaultKey ? {} : {
      data: {
        "$slot": item.name,
      }
    }
    slotList.push(
      _.merge({}, slotConfig, slotsData)
    )
  })
  return slotList;
}



