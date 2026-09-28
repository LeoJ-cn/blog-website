import type { Data } from './data'
import type { DataType, Schema } from './schema'

/** 旧方法类型使用数字枚举，声明顺序决定序列化数值。 */
export enum MethodType {
  pageMethod,
  eventMethod,
  globalMethod,
  initMethod,
  dummyMethod,
  computedMethod,
  watchMethod,
}

/** 旧监听类型使用数字枚举，声明顺序决定序列化数值。 */
export enum MethodWatchType {
  variable,
  computed,
  route,
}

export interface MethodReturn {
  state: boolean
  type?: DataType | ''
  schema?: Schema | Record<string, never>
}

export interface Method {
  id?: string
  uuid?: string
  access_modifier?: {
    accessible?: boolean
    editable?: boolean
  }
  funcName: string
  funcLabel?: string
  /** 兼容旧运行时中作为展示名称读取的别名字段。 */
  label?: string
  sync?: boolean
  explanatory: string
  parameters: Data[]
  blockData?: string
  graphData?: string
  methodType?: MethodType
  watchType?: MethodWatchType
  watchValue?: string
  funcReturn?: MethodReturn
  is_delete?: 1
  origin_type?: string
  temp_data?: Data[]
  process_template_uuid?: string
  process_publish_template_uuid?: string
  bind_page_node_id?: number
  disableProcessTemplateDummy?: boolean
  dummyNodeReplaceDataMap?: Record<string, unknown>
  init?: boolean
  isUsed?: boolean
  dummyReplace?: unknown
  folderId?: string
}

export interface GlobalMethod extends Method {
  uuid: string
  project_uuid: string
  type: string
}
