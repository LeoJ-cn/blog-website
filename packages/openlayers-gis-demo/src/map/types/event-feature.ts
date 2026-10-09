import type { EventLevel, EventStatus, EventType } from '../../types/inspection-event'

/** 地图 Feature 只保存渲染和联动所需字段，完整事件仍由业务数据层维护。 */
export interface EventFeatureProperties {
  /** 连接地图 Feature 与业务事件的唯一键，不能使用 Feature 的对象引用做联动。 */
  eventId: string
  /** 决定点位的业务分类和列表展示文案。 */
  eventType: EventType
  /** 当前处置进度，决定地图点位填充色；地图层只读取、不修改该值。 */
  status: EventStatus
  /** 调度优先级，保留用于业务详情和后续筛选，不再与处置状态共用颜色。 */
  level: EventLevel
}
