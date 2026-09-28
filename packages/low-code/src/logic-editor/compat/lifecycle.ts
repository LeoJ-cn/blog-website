import type { EditPageMold } from '../../types/edit-page'

export interface LifecycleItem {
  mold: EditPageMold
  label: string
  value: string
}

export const Global = { cur_terminal_uuid: '' }
export const PageCenter = { cur_page: { mold: 0 as EditPageMold } }
export const PlatformLifeCycle: Record<string, LifecycleItem[]> = {}
