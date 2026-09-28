/** 逻辑编辑器和流程产物支持的变量类型；字符串值必须与旧协议保持一致。 */
export enum DataType {
  Undefined = 'undefined',
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
  Function = 'function',
  Enum = 'enum',
  Event = 'Event',
  Icon = 'icon',
  Any = 'any',
}

export interface Schema {
  type: DataType
  key?: string
  enumList?: EnumList[] | []
  items?: Schema
  properties?: Schema[]
  label?: string
}

export interface EnumList {
  label: string
  value: string
}
