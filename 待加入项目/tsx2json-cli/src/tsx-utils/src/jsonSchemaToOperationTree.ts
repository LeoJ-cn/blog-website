/**
 * TODO:ts类型完善，目前逻辑还在一直调整
 */


import {
  Utils_JsonSchemaToOperationTreeReturn_Type,
  Utils_PropBoxList_Type,
  Utils_PropBoxParams_Interface,
  Schema_Interface,
  Cli_DataType_Enum,
  Utils_BoxSymbol_Enum,
  Utils_ExportList_Type,
  Cli_ComponentJsonschema_Interface,
  LooseObject,
  getExportsList,
  getUuid
} from './shared/index'
import { OperationList } from './Comps'
import _ from 'lodash'


export const jsonSchemaToOperationTree = function (JsonData: Cli_ComponentJsonschema_Interface): Utils_JsonSchemaToOperationTreeReturn_Type {
  return [
    getCommonConfig(),
    getComponentPropConfig(JsonData)
  ]
}

/**
 * TODO: base 通用设置里面节点的最大id
 * 设置 10000 的原因： 防止交互树二次编辑后，前面的节点和生成的节点id存在重复
 */
let editDomId = 10000;
let FlatAttrList: any[] = []
let AttrListWithEditing: any[] = []
let CompJsonSchema: LooseObject = {}
let RootExportsList: Utils_ExportList_Type = []; // prop & emit

const GuiEditorType: LooseObject = {
  boolean: 'GoChecker',
  number: 'GoNumberInput',
  string: 'GoTextInput',
  enum: "GoItemSelect" // 枚举类型：强制使用下拉框
}
const getSimpleKeyLabel = (str: string) => str.replace(/.*\.(.+)/img, '$1')
const generateDomId = () => editDomId++
const generateOpUuid = () => getUuid('op_tree')
const getValEvil = (type: string) => {
  const fn = new Function(`return new ${_.upperFirst(type)}().valueOf()`)
  return fn()
}
const isHalf = false

function initData() {
  FlatAttrList = []
  AttrListWithEditing = []
  RootExportsList = []
  CompJsonSchema = {}
}

function updateAttrListWithEditing(arr: any[]) {
  AttrListWithEditing.push(...arr)
}

// 属性设置：prop和 emit 设置
function getComponentPropConfig(JsonData: Cli_ComponentJsonschema_Interface) {

  initData()
  CompJsonSchema = JsonData
  RootExportsList = getExportsList(JsonData)
  processDataSeparately(JsonData)
  setAttrEditorList()
  addPropBoxForEditor()

  return {
    "id": 116,
    "parentId": 0,
    "ins_id": generateOpUuid(),
    "mini_method_uuid": "",
    "tag": "PropBox",
    "data": {
      "title": "属性配置",
      "layout": "vertical",
      "name": "hook",
      "selectArrow": true,
      "$style": [],
      "$exports": [
        ...RootExportsList
      ],
      "$exportState": true
    },
    "$complexInfo": {
      "edit_page_uuid": "sal20000_org_key210630eaeq4q6dcb", //  固定不可变

      // "id": 70632,
      // "atom_ins": {
      //   "uuid": "a18fda8eea6a4b2eb79f1c1b6c45cea6",
      //   "origin_page_uuid": "sal20000_org_key2112065s57cr77w1"
      // }
    },
    "locales": {
      "en-US": {
        "title": "Component Setting"
      }
    },
    "children": [
      ...AttrListWithEditing
    ]
  }
}

function setAttrEditorList() {
  FlatAttrList.forEach(iAttr => {
    switch (iAttr.guiBox) {
      case Utils_BoxSymbol_Enum.arrayEditor:
        setArrayEditorData(iAttr);
        break

      case Utils_BoxSymbol_Enum.attrEditorItem:
      default:
        setBaseEditor(iAttr)
        break;
    }
  })
}

function processDataSeparately(JsonData: Cli_ComponentJsonschema_Interface) {
  const rootParentId = 116
  const {
    props = {}
  } = JsonData

  /**
   * TODO: 默认文本，button会使用，考虑放开方式（走注释配置）
   * $text
   */
  // const arrayEditItem = {
  //   guiBox: Utils_BoxSymbol_Enum.attrEditorItem,
  //   parentId: rootParentId,
  //   id: generateDomId(),
  //   renderTreeKey: '$text',
  //   propSchema: {
  //     description: '默认文本',
  //     type: 'string',
  //   }
  // }
  // FlatAttrList.push(arrayEditItem)

  Object.keys(props).forEach(key => {
    const propInfo = props[key]
    deepProcessDataSeparately({
      parentId: rootParentId,
      propSchema: propInfo.schema,
      renderTreeKey: key
    })
  })

}

function deepProcessDataSeparately({ parentId, propSchema, renderTreeKey }: LooseObject) {
  /**
   * 联合类型暂时不处理（全部当成 "string" 处理）
   * type:["string", "number"]
   *
   * type-
   *
   * anyof、notof、 allof
   *
   */
  switch (propSchema.type) {
    case Cli_DataType_Enum.Object: {
      const {
        properties = {}
      } = propSchema
      Object.keys(properties).forEach(key => {
        const pSchema = properties[key]
        const curKey = `${renderTreeKey}.${key}`
        deepProcessDataSeparately({
          parentId,
          propSchema: pSchema,
          renderTreeKey: curKey
        })
      })
      break;
    }
    case Cli_DataType_Enum.Array: {
      const arrayEditItem = {
        guiBox: Utils_BoxSymbol_Enum.arrayEditor,
        parentId,
        renderTreeKey,
        propSchema,
      }
      FlatAttrList.push(arrayEditItem)
      break;
    }
    case Cli_DataType_Enum.String:
    case Cli_DataType_Enum.Number:
    case Cli_DataType_Enum.Boolean:
    default: {
      const baseEditItem = {
        guiBox: Utils_BoxSymbol_Enum.attrEditorItem,
        parentId,
        renderTreeKey,
        propSchema: propSchema,
      }
      FlatAttrList.push(baseEditItem)
      break;
    }
  }
}

function setBaseEditor(iAttr: LooseObject) {
  const {
    parentId,
    renderTreeKey,
    propSchema
  } = iAttr

  const singleAttr = getSingleAttrConfig({
    ...propSchema,
    label: propSchema.description || renderTreeKey,
  })
  const guiEditorType = getPropAttrRenderComp(propSchema)
  const attrItem = getAttrEditorItemTpl({
    parentId,
    renderTreeKey,
    guiEditorType,
    singleAttr
  })
  updateAttrListWithEditing([attrItem])
}

/**
 *
 *不支持anyof等多种item的 array
 *item的对象：所有key必须是基本类型，不允许出现嵌套数据
 */
function setArrayEditorData({ parentId, propSchema, renderTreeKey }: LooseObject) {

  const type = _.get(propSchema, 'items.type')

  if (!type) {
    // 二维数组以及其他数据类型，当成绑定prop处理
    setBaseEditor({
      parentId, propSchema, renderTreeKey
    })
    return;
  }

  const sinKey = getSimpleKeyLabel(renderTreeKey)

  const rootArrayEditor = getArrayEditTpl({
    parentId,
    renderTreeKey,
    title: propSchema.description || `${sinKey}-选项设置`,
    subTitle: `选项`,
    name: `${sinKey}-name`,
    defaultData: null,
    nodeConfigs: null
  })

  // 修改defaultData以及nodeConfigs
  generateArrayEditorData({
    _arraryEditorInfo: rootArrayEditor,
    _prePath: '',
    _isComeFromArray: true,


    parentId,
    propSchema: {
      ...propSchema.items
    },
    renderTreeKey
  })

  updateAttrListWithEditing([rootArrayEditor])
}

function generateArrayEditorData({
  _arraryEditorInfo,
  _prePath,
  _isComeFromArray,

  parentId,
  propSchema,
  renderTreeKey
}: LooseObject) {

  const _loopType = propSchema.type
  switch (_loopType) {
    case Cli_DataType_Enum.Array: {

      const sinKey = getSimpleKeyLabel(renderTreeKey)

      const curId = generateDomId()

      const itemRootArrayEditor = getArrayEditTpl({
        parentId: curId,
        renderTreeKey,
        title: propSchema.description || `${sinKey}-选项设置`,
        subTitle: `选项`,
        name: `${sinKey}-name`,
        defaultData: null,
        nodeConfigs: null
      })

      // 修改defaultData以及nodeConfigs
      generateArrayEditorData({
        // _loopType: _.get(propSchema, 'items.type'),
        _arraryEditorInfo: itemRootArrayEditor,
        _prePath: '',
        _isComeFromArray: true,

        parentId: curId,
        propSchema: propSchema.items,
        renderTreeKey
      })

      if (!_arraryEditorInfo.data.defaultData) {
        _arraryEditorInfo.data.defaultData = {}
      }
      if (!_arraryEditorInfo.data.defaultData.$exports) {
        _arraryEditorInfo.data.defaultData.$exports = [] as any[]
      }
      if (!_arraryEditorInfo.data.nodeConfigs) {
        _arraryEditorInfo.data.nodeConfigs = [] as any[]
      }

      const {
        data: {
          defaultData,
          nodeConfigs
        }
      } = _arraryEditorInfo

      _.set(defaultData, renderTreeKey, [])

      defaultData.$exports.push({
        "attrKey": renderTreeKey,
        "sortIdx": -1
      })

      const pickData = _.pick(
        itemRootArrayEditor.data,
        ['title', 'subTitle', 'bottomLine', 'minSize', 'nodeConfigs', 'defaultData']
      )
      nodeConfigs.push({
        "id": curId,
        "label": propSchema.description || `nc-${renderTreeKey}`,
        "type": 'ArrayEdit',
        "key": renderTreeKey,
        isHalf,
        assignObject: pickData
      })
      break;
    }
    case Cli_DataType_Enum.Object: {
      const properties: LooseObject = propSchema.properties
      Object.keys(properties).forEach(arrItemObjKey => {
        const curPropSchema = properties[arrItemObjKey]
        const curRenderTreeKey = _prePath ? `${_prePath}.${arrItemObjKey}` : arrItemObjKey
        generateArrayEditorData({
          _arraryEditorInfo,
          _prePath: curRenderTreeKey,
          _isComeFromArray: curPropSchema.type === Cli_DataType_Enum.Array,

          parentId,
          propSchema: curPropSchema,
          renderTreeKey: curRenderTreeKey
        })
      })
      break;
    }
    case Cli_DataType_Enum.String:
    case Cli_DataType_Enum.Number:
    case Cli_DataType_Enum.Boolean:
    default: {
      /**
       * 数组类型的item-直接覆盖
       * 对象类型的item-数据合并
       */

      const singleAttr = getSingleAttrConfig({
        ...propSchema,
        label: propSchema.description || renderTreeKey,
      })
      const guiEditorType = getPropAttrRenderComp(propSchema)

      if (_isComeFromArray) {
        const defaultData: any = getValEvil(_loopType)
        const nodeConfigs: any[] = [
          {
            "id": generateDomId(),
            "type": guiEditorType,
            isHalf,
            "key": "",
            ...singleAttr,
            label: `${_loopType}`
          }
        ]
        _arraryEditorInfo.data.defaultData = defaultData
        _arraryEditorInfo.data.nodeConfigs = nodeConfigs
      } else {

        if (!_arraryEditorInfo.data.defaultData) {
          _arraryEditorInfo.data.defaultData = {}
        }
        if (!_arraryEditorInfo.data.defaultData.$exports) {
          _arraryEditorInfo.data.defaultData.$exports = [] as any[]
        }
        if (!_arraryEditorInfo.data.nodeConfigs) {
          _arraryEditorInfo.data.nodeConfigs = [] as any[]
        }

        const {
          data: {
            defaultData,
            nodeConfigs
          }
        } = _arraryEditorInfo

        _.set(defaultData, renderTreeKey, getValEvil(_loopType))

        defaultData.$exports.push({
          "attrKey": renderTreeKey,
          "sortIdx": -1
        })


        const sinKey = getSimpleKeyLabel(renderTreeKey)

        nodeConfigs.push({
          "id": generateDomId(),
          "type": guiEditorType,
          "key": renderTreeKey,
          isHalf,
          ...singleAttr,

          label: propSchema.description || sinKey
        })
      }

      break;
    }
  }
}

function getArrayEditTpl({
  parentId,
  renderTreeKey,
  title,
  subTitle,
  name,
  defaultData,
  nodeConfigs
}: LooseObject) {
  return {
    "id": generateDomId(),
    parentId,
    "ins_id": generateOpUuid(),
    "mini_method_uuid": "",
    "tag": "ArrayEdit",
    "render_tree_node": {
      "key": renderTreeKey
    },
    "data": {
      "bottomLine": false, // arrayedit不显示下划线

      "title": title, // ？？？
      "subTitle": subTitle, // ？？？
      "name": name, // ？？？

      /**
       * TODO-item各种类型的场景:
       * 基本数据类型时候 new ${Type}().valueOf()
       * 对象的时候: {field1:'', filed2:0, $exports:[]}
       * 数组: 参考基本类型，等于 []
       */
      "defaultData": defaultData,

      "nodeConfigs": nodeConfigs,

      "$style": {},
      "$exports": [
        ...RootExportsList
      ],

      "tag": "", // nodeConfigs不需要设置，需要设置的场景在 “交互树页面” 去制作
      // "factPath": "children", 已废弃
      "defaultChildren": [],
      "$exportState": true,
      "selectArrow": true,
    },
    "$complexInfo": {
      "edit_page_uuid": "sal20000_org_key210705eaejvo6d3w",

      // "id": 70791,
      // "atom_ins": {
      //   "uuid": "11262acb8763419e9db0b87d0d466b32",
      //   "origin_page_uuid": "sal20000_org_key210709eaemff6dot"
      // }
    },
    "locales": {
      "en-US": {
        // "title": "---",
      }
    },
    "children": []
  }
}

function getAttrEditorItemTpl({ parentId, renderTreeKey, guiEditorType, singleAttr }: LooseObject) {
  return {
    id: generateDomId(),
    parentId,
    "ins_id": generateOpUuid(),
    "mini_method_uuid": "",
    "tag": "AttrEditorItem",
    "data": {
      "type": guiEditorType,
      "$style": {},
      "$exports": [
        {
          "attrKey": "type",
          "sortIdx": -1
        },
        {
          "attrKey": "singleAttr",
          "sortIdx": -1
        },
        {
          "eventKey": "on-change",
          "sortIdx": -1,
          "task": {
            "label": "当内容改变时",
            "process": {
              "type": "bind_method",
              "defaultMethods": [],
              "custom_access": true
            }
          }
        },
        {
          "eventKey": "beforeRender",
          "sortIdx": -1,
          "task": {
            "label": "当组件渲染前",
            "process": {
              "type": "bind_method",
              "defaultMethods": [],
              "custom_access": true
            }
          }
        }
      ],
      "$exportState": true,
      singleAttr
    },
    render_tree_node: {
      key: renderTreeKey
    },
    // 固定配置
    "$complexInfo": {
      "edit_page_uuid": "sal20000_org_key210701eaejqn6d2t",
      // "atom_ins": {
      //   "uuid": "9402c95f6df44cac952471b6b98f627f",
      //   "origin_page_uuid": "sal20000_org_key2208121wrqhzd5ft"
      // }
    },
    "version": "0.0.1",
    "children": []
  }
}

function getPropAttrRenderComp(schema: Schema_Interface) {
  // 注释中指定的组件
  const assignCompFromComment = _.get(schema, 'additionalProperties.gui_render_comp', '');
  if (assignCompFromComment && OperationList.indexOf(assignCompFromComment) !== -1) {
    return assignCompFromComment
  }
  // 枚举类型 强制使用 下拉框组件
  if (schema.enum) {
    return GuiEditorType.enum
  }
  // 推论schema类型组件
  return GuiEditorType[schema.type] || GuiEditorType.string

}

function getSingleAttrConfig(schema: Schema_Interface) {
  // 枚举类型 强制使用 下拉框组件
  if (schema.enum) {
    return {
      label: schema.label,
      enumList: _.map(schema.enum, item => ({
        value: item,
        label: `${item}`,
        id: generateDomId()
      }))
    }
  }
  return {
    label: schema.label
  }
}

/**
 * 美化样式： 为所有属性编辑添加 propbox
 * ComponentTree: gui项目 packages/gui/interfaces/front_end_component.ts
 */
function addPropBoxForEditor() {
  // AttrListWithEditing
  const propBoxList: Utils_PropBoxList_Type = []
  const boxStyle = {
    "width": "99%",
    "float": "left",
    "padding-right": "4px"
  }
  AttrListWithEditing.forEach(attrTree => {
    const fatherRenderKey =
      _.get(attrTree, 'render_tree_node.key', '')
        .split('.').shift()
    const fatherPropbox = _.find(propBoxList, { __rootPropKey: fatherRenderKey }) as LooseObject
    if (!fatherPropbox) {

      const rootCommentLabel = _.get(CompJsonSchema, `props.${fatherRenderKey}.label`, fatherRenderKey)
      const propBoxId = generateDomId()
      const propBoxParentId = attrTree.parentId

      attrTree.parentId = propBoxId
      _.set(attrTree, 'data.$style', boxStyle)

      const propBox = getPropBoxConfig({
        __rootPropKey: fatherRenderKey,
        title: rootCommentLabel,
        id: propBoxId,
        parentId: propBoxParentId,
        locales: {},
        children: [
          attrTree
        ]
      })

      propBoxList.push(propBox)
    } else {
      attrTree.parentId = fatherPropbox.id
      _.set(attrTree, 'data.$style', boxStyle)
      fatherPropbox.children.push(attrTree)
    }
  })

  propBoxList.forEach(dd => delete dd.__rootPropKey)
  AttrListWithEditing = propBoxList
}

function getPropBoxConfig({
  __rootPropKey,
  title,
  id,
  parentId,
  locales,
  children
}: Utils_PropBoxParams_Interface) {
  const titleHtml = title.replace(/([\s\S]{5})/img, '<div>$1</div>')

  return {
    __rootPropKey, // 临时变量
    id,
    parentId,
    "ins_id": generateOpUuid(),
    "mini_method_uuid": "",
    "tag": "PropBox",
    "data": {
      // titleHtml,
      // title: title.length > 4 ? title.slice(0, 4) + '...' : title, //最多显示4个中文；8个英文
      title: titleHtml,
      "layout": "horizontal",
      "name": "common",
      "selectArrow": false, // 箭头
      "$style": [],
      "$exports": [
        {
          "attrKey": "title",
          "sortIdx": -1
        },
        {
          "attrKey": "name",
          "sortIdx": -1
        },
        {
          "attrKey": "selectArrow",
          "sortIdx": -1
        },
        {
          "attrKey": "layout",
          "sortIdx": -1
        },
        {
          "eventKey": "on-change",
          "sortIdx": -1,
          "task": {
            "label": "当内容改变时",
            "process": {
              "type": "bind_method",
              "defaultMethods": [],
              "custom_access": true
            }
          }
        },
        {
          "eventKey": "beforeRender",
          "sortIdx": -1,
          "task": {
            "label": "当内容渲染前",
            "process": {
              "type": "bind_method",
              "defaultMethods": [],
              "custom_access": true
            }
          }
        },
        {
          "eventKey": "isShow",
          "sortIdx": -1,
          "task": {
            "label": "控制内容是否显示",
            "process": {
              "type": "bind_method",
              "defaultMethods": [],
              "custom_access": true
            }
          }
        }
      ],
      "$exportState": true
    },
    "$complexInfo": {
      "edit_page_uuid": "sal20000_org_key210630eaeq4q6dcb"
    },
    "locales": locales,
    children: [
      ...children
    ]
  }
}

/**
 *
 * 固定模版数据(TS 无须定义，固定模板)
 */
function getCommonConfig() {
  return {
    "id": 2,
    "parentId": 0,
    "ins_id": generateOpUuid(),
    "mini_method_uuid": "",
    "tag": "PropBox",
    "data": {
      "title": "通用设置",
      "layout": "vertical",
      "name": "common",
      "selectArrow": true,
      "$style": [],
      "$exports": [
        {
          "attrKey": "title",
          "sortIdx": -1
        },
        {
          "attrKey": "name",
          "sortIdx": -1
        },
        {
          "attrKey": "selectArrow",
          "sortIdx": -1
        },
        {
          "attrKey": "layout",
          "sortIdx": -1
        },
        {
          "eventKey": "on-change",
          "sortIdx": -1,
          "task": {
            "label": "当内容改变时",
            "process": {
              "type": "bind_method",
              "defaultMethods": [],
              "custom_access": true
            }
          }
        },
        {
          "eventKey": "beforeRender",
          "sortIdx": -1,
          "task": {
            "label": "当内容渲染前",
            "process": {
              "type": "bind_method",
              "defaultMethods": [],
              "custom_access": true
            }
          }
        },
        {
          "eventKey": "isShow",
          "sortIdx": -1,
          "task": {
            "label": "控制内容是否显示",
            "process": {
              "type": "bind_method",
              "defaultMethods": [],
              "custom_access": true
            }
          }
        }
      ],
      "$exportState": true
    },
    "$complexInfo": {
      "edit_page_uuid": "sal20000_org_key210630eaeq4q6dcb",

      // "id": 70632,
      // "atom_ins": {
      //   "uuid": "deee0757c8f5411d9b0607ee265d5999",
      //   "origin_page_uuid": "sal20000_org_key210705eaeiww6dom"
      // }
    },
    "locales": {
      "en-US": {
        "title": "General Setting"
      }
    },
    "children": [
      {
        "id": 3,
        "parentId": 2,
        "ins_id": generateOpUuid(),
        "mini_method_uuid": "",
        "tag": "PropSize",
        "data": {
          "$style": [],
          "$exports": [
            {
              "attrKey": "disabled",
              "sortIdx": -1
            },
            {
              "eventKey": "on-change",
              "sortIdx": -1,
              "task": {
                "label": "当内容改变时",
                "process": {
                  "type": "bind_method",
                  "defaultMethods": [],
                  "custom_access": true
                }
              }
            },
            {
              "eventKey": "beforeRender",
              "sortIdx": -1,
              "task": {
                "label": "当组件渲染前",
                "process": {
                  "type": "bind_method",
                  "defaultMethods": [],
                  "custom_access": true
                }
              }
            }
          ],
          "$exportState": true,
          "$on": {
            "change": ""
          }
        },
        "$complexInfo": {
          "id": 70638,
          "edit_page_uuid": "sal20000_org_key210701eaepse6did",
          "atom_ins": {
            "uuid": "cab29671f076487ea97e1f1bc23db470",
            "origin_page_uuid": "sal20000_org_key210705eaeiww6dom"
          }
        },
        "alias": "",
        "children": []
      },
      {
        "id": 4,
        "parentId": 2,
        "ins_id": generateOpUuid(),
        "mini_method_uuid": "",
        "tag": "PropOpacity",
        "data": {
          "$style": [],
          "$exports": [
            {
              "attrKey": "disabled",
              "sortIdx": -1
            }
          ],
          "$exportState": true,
          "disabled": false
        },
        "$complexInfo": {
          "id": 70640,
          "edit_page_uuid": "sal20000_org_key210701eaej2u6dh0",
          "atom_ins": {
            "uuid": "38561daa1b08493fb5bfbe9970cfbeb5",
            "origin_page_uuid": "sal20000_org_key210705eaeiww6dom"
          }
        },
        "children": []
      },
      {
        "id": 5,
        "parentId": 2,
        "ins_id": generateOpUuid(),
        "mini_method_uuid": "",
        "tag": "PropBorder",
        "data": {
          "$style": [],
          "$exports": [
            {
              "attrKey": "disabled",
              "sortIdx": -1
            }
          ],
          "$exportState": true,
          "disabled": false
        },
        "$complexInfo": {
          "id": 70641,
          "edit_page_uuid": "sal20000_org_key210701eaenam6dl0",
          "atom_ins": {
            "uuid": "228d8c75879d477698d11e96f26ab251",
            "origin_page_uuid": "sal20000_org_key210705eaeiww6dom"
          }
        },
        "children": []
      },
      {
        "id": 7,
        "parentId": 2,
        "ins_id": generateOpUuid(),
        "mini_method_uuid": "",
        "tag": "PropShadow",
        "data": {
          "$style": [],
          "$exports": [
            {
              "attrKey": "disabled",
              "sortIdx": -1
            }
          ],
          "$exportState": true,
          "disabled": false
        },
        "$complexInfo": {
          "id": 70643,
          "edit_page_uuid": "sal20000_org_key210701eaeper6dd5",
          "atom_ins": {
            "uuid": "925cc35b3d3c4b44b03631836fe1c167",
            "origin_page_uuid": "sal20000_org_key210705eaeiww6dom"
          }
        },
        "children": []
      },
      {
        "id": 6,
        "parentId": 2,
        "ins_id": generateOpUuid(),
        "mini_method_uuid": "",
        "tag": "PropRadius",
        "data": {
          "$style": [],
          "$exports": [],
          "$exportState": true
        },
        "$complexInfo": {
          "id": 70642,
          "edit_page_uuid": "sal20000_org_key210701eaeo0s6d56",
          "atom_ins": {
            "uuid": "82b0734db0d84f01a6c9f36de0e7dc44",
            "origin_page_uuid": "sal20000_org_key210705eaeiww6dom"
          }
        },
        "children": []
      },
      {
        "id": 8,
        "parentId": 2,
        "ins_id": generateOpUuid(),
        "mini_method_uuid": "",
        "tag": "PropBackGround",
        "data": {
          "$style": [],
          "$exports": [
            {
              "eventKey": "on-change",
              "sortIdx": -1,
              "task": {
                "label": "当内容改变时",
                "process": {
                  "type": "bind_method",
                  "defaultMethods": [],
                  "custom_access": true
                }
              }
            }
          ],
          "$exportState": true
        },
        "$complexInfo": {
          "id": 70644,
          "edit_page_uuid": "sal20000_org_key210701eaejd86dsi",
          "atom_ins": {
            "uuid": "2e65de28d30d4362a5e9943d8756b9c8",
            "origin_page_uuid": "sal20000_org_key210705eaeiww6dom"
          }
        },
        "children": []
      },
      {
        "id": 9,
        "parentId": 2,
        "ins_id": generateOpUuid(),
        "mini_method_uuid": "",
        "tag": "PropMarginPadding",
        "data": {
          "$style": [],
          "$exports": [],
          "$exportState": true,
          "type": "margin"
        },
        "$complexInfo": {
          "id": 70645,
          "edit_page_uuid": "sal20000_org_key210701eaemsd6dwp",
          "atom_ins": {
            "uuid": "b2aa2aab6d1a4aa4b32718fe3a96e025",
            "origin_page_uuid": "sal20000_org_key210705eaeiww6dom"
          }
        },
        "children": []
      },
      {
        "id": 15,
        "parentId": 2,
        "ins_id": generateOpUuid(),
        "mini_method_uuid": "",
        "tag": "PropMarginPadding",
        "data": {
          "$style": [],
          "$exports": [],
          "$exportState": true,
          "type": "padding",
          "disabled": false
        },
        "$complexInfo": {
          "id": 70645,
          "edit_page_uuid": "sal20000_org_key210701eaemsd6dwp",
          "atom_ins": {
            "uuid": "1b0b5515716d455c9475998ae110e0cf",
            "origin_page_uuid": "sal20000_org_key210707eaeom06dgi"
          }
        },
        "children": []
      }
    ]
  }
}



