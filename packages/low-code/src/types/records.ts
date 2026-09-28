export interface LogicNodeRecord {
  id: number
  node_config: string
  operation_tree: string
  [key: string]: unknown
}

export interface MethodRecord {
  id: number
  appid?: string
  doc_version?: string
  uuid: string
  name: string
  label: string
  props: string | any
  realization: string | any
  [key: string]: unknown
}
