import { EnumList_Interface, Schema_Interface, LooseObject } from './standard'

/**
 * Utils_Schema_Interface.properties 是数组，历史原因，gui项目需要数组
 */
export interface Utils_Schema_Interface {
  type?: any; // 基本类型
  key?: string;
  enumList?: EnumList_Interface[] | [];
  items?: Schema_Interface; // type = 数组的时候
  properties?: Schema_Interface[]; // ！！！
  label?: string; // schema的key的中文

  description?: string, //原子数据类型注释
  additionalProperties?: { // 注释中添加的附加属性
    gui_render_comp: any; // 指定gui渲染组件
    [OtherParams: string]: any;
  },
  // 其他未分析的定义（比如anyof等）
  [other: string]: any
}


/**
 * 最小方法 Category属性 枚举
 */
export enum Utils_SchemaToMethodCategory_Enum {
  event = 'event',
  attr = 'attr'
}

export interface Utils_PropConfigListItem_Interface {
  key: string; // propname
  label: string; // 注释
  category: Utils_SchemaToMethodCategory_Enum.attr, // prop是attr； emit是event
  schema: Utils_Schema_Interface,
  // value: "????",
  default?: any,
  isExoprt: boolean,
  additionalProperties: LooseObject
}

export interface Utils_EventConfigListItem_Interface {
  key: string; // @Emit事件名
  label: string; // 注释：描述事件
  category: Utils_SchemaToMethodCategory_Enum.event,
  additionalProperties: LooseObject,
  isExoprt: boolean,
  payload: Utils_ComponentEventPayload_Interface,
  task: LooseObject // TODO: 具体配置
}

export type Utils_ComponentEventPayload_Interface = Array<{
  key: string; // 形参
  schema: Utils_Schema_Interface; // 形参-类型定义
  label?: string; // 形参的注释(schema标准是description，label为了适配gui平台)
  description?: string; // 形参的注释 
  required?: boolean; // 非文档要求，自行添加的控制
  [other: string]: any
}>

export interface Utils_ComponentEvent_Interface {
  [evetName: string]: {
    schema: Schema_Interface; // @Emit函数返回值
    label: string; // @Emit 注释：事件名
    additionalProperties: LooseObject; // 通过注释附加的数据
    payload: Utils_ComponentEventPayload_Interface
  }
}

export type Utils_JsonSchemaToMethodReturn_Type = Array<Utils_PropConfigListItem_Interface | Utils_ComponentEvent_Interface | {}>


/**
 * $exports 返回[多处共用]
 */
export type Utils_ExportList_Type = Array<Utils_ExportProp_Interface | Utils_ExportEvent_Interface>

export interface Utils_ExportProp_Interface {
  attrKey: string; // PropName
  alias: string;
  sortIdx: -1;
}

export interface Utils_ExportEvent_Interface {
  eventKey: string, // EventName
  alias: string,
  sortIdx: number,
  task: {
    label: string,
    process: {
      type: string,
      defaultMethods: any[],
      custom_access: boolean
    }
  },
}



/**
* jsonSchemaToAtomComponent
*/
// TODO...
export type Utils_JsonSchemaToAtomComponentReturn_Type = any

// 原子组件固定的box
export interface Utils_AtomComponentBox_Interface {
  id: 0; // 当前节点的id
  parentId: -1; // 当前节点的父节点id
  ins_id: string; // 唯一id（用于gui 遍历查找）
  tag: "div",
  data: {
    "$style": {
      width: "100%"
    }
  }
}

// 原子组件的content
export interface Utils_AtomComponentRenderContent_Interface {
  "id": 1;
  "parentId": 0;
  "ins_id": string, // 唯一id（用于gui 遍历查找）
  // 渲染tag，查找最小方法tag
  tag: string;
  "data": {
    "$default_value_locales": {
      "zh-CN": {
        "$text": string
      },
      "en-US": {
        "$text": string
      }
    },
    "$text"?: string,
    "$style": {},
    "$exports": Utils_ExportList_Type,
    "$exportState": true,
    [propName: string]: any // prop的默认值
  },
  "children": []
}


/**
 * 交互树制作（TODO: arrList 定义）
 */

// TODO:...
export type Utils_JsonSchemaToOperationTreeReturn_Type = any

export enum Utils_BoxSymbol_Enum {
  attrEditorItem = 'attrEditorItem',
  arrayEditor = 'arrayEdit',
}

export interface Utils_PropBoxParams_Interface {
  __rootPropKey: string; // 属性顶层属性（临时变量）
  id: number; // 子节点
  parentId: number; // 父节点
  title: string; // propbox展开文本

  // 国际化
  locales: {
    [country: string]: {
      [i18nKey: string]: string
    }
  };

  // 子属性编辑
  children: any[];
}

export type Utils_PropBoxList_Type = Array<any>

export type Utils_JsonSchemaToDefReturn_Type = {
  jsonSchemaToMethod: Utils_JsonSchemaToMethodReturn_Type,
  jsonSchemaToAtomComponent: Utils_JsonSchemaToAtomComponentReturn_Type,
  jsonSchemaToOperationTree: Utils_JsonSchemaToOperationTreeReturn_Type
}
