import { Schema_Interface, LooseObject } from './standard'

export enum Cli_DataType_Enum { // 所有变量可能存在的类型
  Undefined = 'undefined',
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
  // Function = 'function',
  // Enum = 'enum', // 支持下拉框   [1,2,3,...] | ['a','b','c',...] | [{key:'xx',val:'xx'},....]
  // Event = 'Event',
  // Icon = 'icon', // 支持图标库
  // Any = 'any', // 流程图使用的任意类型
}

export interface Cli_ComponentJsonschema_Interface {
  tag: string // 组件名
  props: Cli_ComponentProp_Interface
  events: Cli_ComponentEvent_Interface
  slots?: Array<{
    name: string // slot_name
    [otherSlotConfig: string]: any
  }>
  definitions?: LooseObject
  configs?: {
    // 远端配置
    remote_config?: Cli_RemoteConfig_Interface
    // 依赖配置
    depend_config?: any
    // 其他配置（未来拓展）
    [otherConfig: string]: any
  }
}

export interface Cli_RemoteConfig_Interface {
  path: {
    type: string
    appid: string
    remoteEntry: string
    path: string
  }
  category: string
}

// @Prop
export interface Cli_ComponentProp_Interface {
  [propName: string]: {
    schema: Schema_Interface // @Prop类型定义
    label: string // prop字段的顶层注释【如果是对象，会被拍平】
    additionalProperties: LooseObject // 通过注释附加的数据
    default?: any // 字段默认值
  }
}

// @Emit
export interface Cli_ComponentEvent_Interface {
  [evetName: string]: {
    schema: Schema_Interface // @Emit函数返回值
    label: string // @Emit 注释：事件名
    additionalProperties: LooseObject // 通过注释附加的数据
    payload: Cli_ComponentEventPayload_Interface
  }
}

// 函数-参数 定义
export type Cli_ComponentEventPayload_Interface = Array<{
  key: string // 形参
  schema: Schema_Interface // 形参-类型定义
  label?: string // 形参的注释(schema标准是description，label为了适配gui平台)
  description?: string // 形参的注释
  required?: boolean // 非文档要求，自行添加的控制
  [other: string]: any
}>
