import type { EventLevel, EventStatus, EventType } from '../../types/inspection-event'

/** 地图 Feature 只保存渲染和联动所需字段，完整事件仍由业务数据层维护。 */
export interface EventFeatureProperties {
  /** 连接地图 Feature 与业务事件的唯一键，不能使用 Feature 的对象引用做联动。 */
  eventId: string
  /** 决定点位的业务分类和列表展示文案。 */
  eventType: EventType
  /** 当前处置进度，仅用于展示，不由地图层修改。 */
  status: EventStatus
  /** 决定普通点位的颜色等级。 */
  level: EventLevel
}
