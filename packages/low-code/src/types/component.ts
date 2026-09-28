export interface ComponentTree {
  id?: number
  parentId?: number
  ins_id?: string
  tag?: string
  mini_method_uuid?: string
  data: Record<string, any>
  children: ComponentTree[]
  [key: string]: any
}
