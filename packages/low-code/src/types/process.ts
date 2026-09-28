/**
 * 旧 Blockly 流程的最小序列化节点。
 * `value` 中的数组表示 statement/多节点插槽，普通对象表示嵌套 value 块。
 */
export interface SimpleProcessData {
  id: string
  type: string
  x?: null | string
  y?: null | string
  movable?: null | string
  deletable?: null | string
  mutation?: Record<string, string>
  value?: Record<string, undefined | string | SimpleProcessData | SimpleProcessData[]>
}
