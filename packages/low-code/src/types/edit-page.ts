/**
 * 原子组件的页面类型。数字值由枚举顺序决定，属于持久化协议的一部分。
 */
export enum EditPageMold {
  Component = 0,
  ContentPage = 1,
  LayoutPage = 2,
  MultiPage = 3,
  CustomComponent = 4,
  AttrEditorPage = 5,
  InteractEditorPage = 6,
  ControlEditorPage = 7,
  MultiComponent = 8,
  CodePage = 9,
  ProcessPage = 10,
  ProcessComponent = 11,
}

export interface OperationComponentData {
  $isShow?: boolean | string
  $beforeRender?: string | ((...args: unknown[]) => void)
  $class?: string
  $on?: Record<string, string | ((...args: unknown[]) => void) | Array<string | ((...args: unknown[]) => void)>>
  $tips?: string
  [key: string]: unknown
}

/**
 * 旧操作树节点。children 可以是文本或子节点数组，保持原协议的双形态。
 */
export interface OperationComponentTree {
  id?: number
  ins_id?: string
  tag?: string
  data?: OperationComponentData
  locales?: Record<string, Record<string, string>>
  children?: string | OperationComponentTree[]
  variableId?: string
  variableEditable?: boolean
  methodEditable?: boolean
  render_tree_node?: {
    ins_id?: string
    key?: string
    variable_key?: string
  }
  code_tree_node?: {
    ins_id?: string
    key?: string
    variable_key?: string
  }
  [key: string]: unknown
}
