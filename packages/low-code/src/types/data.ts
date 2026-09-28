import type { DataType, Schema } from './schema'

export { DataType } from './schema'
export type { Schema } from './schema'

export interface AccessModifier {
  accessible?: boolean
  editable?: boolean
}

export interface DataBase {
  id?: string
  access_modifier?: AccessModifier
  type: DataType
  name: string
  label?: string
  value?: unknown
  schema?: Schema
  comment?: string
  block_data?: string
}

/** 变量分类的字符串值会进入旧图数据，迁移时不得调整。 */
export enum DataCategory {
  Page = 'page',
  Route = 'route',
  Component = 'component',
  Interface = 'interface',
  Global = 'global',
  Prop = 'prop',
  Temp = 'temp',
}

export interface Data extends DataBase {
  uuid?: string
  project_uuid?: string
  category?: DataCategory
  isUsed?: boolean
  is_delete?: 0 | 1
  defaultValue?: string
  templateDataId?: string
  routeDataType?: 'query' | 'meta'
}

export interface GlobalData {
  uuid?: string
  project_uuid: string
  type: DataType
  name: string
  label?: string
  value?: string
  schema?: string
  comment?: string
  block_data?: string
}
