import type { EventLevel, EventStatus } from '../../types/inspection-event'

export interface EventLevelVisual {
  /** 面向业务用户展示的中文等级名称。 */
  label: string
}

export interface EventStatusVisual {
  /** 面向业务用户展示的中文状态名称。 */
  label: string
  /** 地图点位填充色及业务界面状态色，使用 CSS 颜色值。 */
  color: string
}

export const EVENT_LEVEL_VISUALS: Record<EventLevel, EventLevelVisual> = {
  HIGH: { label: '高等级' },
  MEDIUM: { label: '中等级' },
  LOW: { label: '低等级' },
}

export const EVENT_STATUS_VISUALS: Record<EventStatus, EventStatusVisual> = {
  PENDING: { label: '待处理', color: '#ef4444' },
  PROCESSING: { label: '处理中', color: '#f59e0b' },
  DONE: { label: '已完成', color: '#22c55e' },
}

/** SelectionLayer 的最外层光圈颜色，不承担等级或处理状态语义。 */
export const EVENT_SELECTION_COLOR = '#22d3ee'
