import type { Data } from '../types/data'
import type { Method } from '../types/method'

/** 宿主返回的动态逻辑节点定义；字符串字段兼容原后端持久化协议。 */
export interface LowCodeLogicNodeRecord {
  /** 节点类型，例如 `logic-try-catch-node`。 */
  name: string
  /** 节点生成器配置，可为原协议 JSON 字符串或已解析对象。 */
  node_config?: string | Record<string, unknown>
  /** 右侧配置面板组件树，可为 JSON 字符串或已解析对象。 */
  operation_tree?: string | Record<string, unknown> | Array<Record<string, unknown>>
  /** 节点说明，可为 JSON 字符串或已解析的中英文对象。 */
  intro?: string | { zh_cn: string; en_us: string }
}

export interface LowCodeStoreAdapter {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  delete(key: string): void
}

export interface LowCodeDispatcherAdapter {
  listen(event: string, listener: (...args: any[]) => unknown): void
  trigger(event: string, ...args: any[]): unknown
  unlisten(event: string, listener: (...args: any[]) => unknown): void
}

export interface LowCodeControllerAdapter {
  getCategories(): Promise<unknown[]>
  getLogicNodes(): Promise<LowCodeLogicNodeRecord[]>
  getApis(): Promise<unknown[]>
}

export interface LowCodeFeedbackAdapter {
  success(message: string): void
  error(message: string): void
  warning(message: string): void
  confirm(message: string): Promise<boolean>
}

export interface LowCodeCompatibilityContext {
  store: LowCodeStoreAdapter
  dispatcher: LowCodeDispatcherAdapter
  methods: Method[]
  data: Data[]
  controller: LowCodeControllerAdapter
  getLocale(): string
  translate(key: string): string
  feedback: LowCodeFeedbackAdapter
}
