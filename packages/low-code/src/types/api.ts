export interface CallApiProcessNodeFrontAttrApi {
  id: number
  appkey: string
  channel: number
  uuid: string
  appid: string
  category_label: string
  category_uuid: string
  channelAliasValue: string
  cover: string
  created_at: string
  description: string
  doc_version: string
  git_uuid: string
  introduce: string
  is_delete: 0
  is_standard_model: 0
  label: string
  library_label: string
  library_uuid: string
  mold: number
  name: string
  package_items: string
  package_type: ''
  position: 0
  props: string
  realization: string
  standard_model_uuid: ''
  status: 1
  tags: ''
  task_id: number
  terminal_label: string
  terminal_uuid: string
  type: ''
  updated_at: string
  version: string
}

export interface CategoryAllRequest {
  type?: number
  order_by?: string
  is_delete?: number
  mold?: number | number[]
  terminal_uuid?: string
  library_uuid?: string | string[]
  page?: number
  limit?: number
  need_both?: string | number
  label?: string
  appid?: string
}

export interface LibraryRecord {
  id: number
  appkey: string
  channel: number
  uuid: string
  field_uuid: string
  field_label?: string
  terminal_uuid: string
  terminal_label?: string
  name: string
  label: string
  type: number
  is_delete: number
  created_at: string
  updated_at: string
  appid?: string
  sort_order?: number
}

export interface MethodRecord {
  id: number
  appid?: string
  doc_version?: string
  appkey: string
  channel: number
  uuid: string
  category_uuid: string
  terminal_uuid: string
  terminal_label?: string
  library_uuid: string
  mold: number
  name: string
  label: string
  type: string
  tags: string
  version: string
  cover: string
  introduce: string
  description: string
  props: string | unknown
  realization: string | unknown
  package_type: string
  package_items: string
  git_uuid: string
  is_standard_model: number
  standard_model_uuid: string
  is_delete: number
  status: string
  created_at: string
  updated_at: string
  task_id: number
  channelAliasValue?: string
}

export enum Language {
  En = 'en-US',
  Zh = 'zh-CN',
}
