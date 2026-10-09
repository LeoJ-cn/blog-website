export type EventType =
  | 'ROAD_DAMAGE' // 道路破损，需要道路养护人员处理。
  | 'LIGHT_FAILURE' // 路灯故障，需要照明设施人员处理。
  | 'GARBAGE' // 垃圾堆积，需要环卫人员处理。
  | 'MANHOLE' // 井盖异常，可能涉及公共安全风险。

export type EventStatus =
  | 'PENDING' // 已上报但尚未开始处置。
  | 'PROCESSING' // 已派单并正在现场处置。
  | 'DONE' // 已完成处置并关闭事件。

export type EventLevel =
  | 'HIGH' // 高优先级，需要优先调度。
  | 'MEDIUM' // 常规优先级，按计划处理。
  | 'LOW' // 低优先级，可合并到日常巡检任务。

export interface InspectionEvent {
  id: string
  type: EventType
  status: EventStatus
  level: EventLevel
  /** WGS84 经度，范围为 -180 到 180。 */
  lng: number
  /** WGS84 纬度，范围为 -90 到 90。 */
  lat: number
  address: string
  /** ISO 8601 格式的创建时间。 */
  createdAt: string
}

export interface InspectionEventFilter {
  /** 事件 ID 或地址关键词；空字符串表示不限制关键词。 */
  keyword: string
  /** 指定事件类型；null 表示包含全部类型。 */
  type: EventType | null
  /** 指定处置状态；null 表示包含全部状态。 */
  status: EventStatus | null
  /** 指定调度等级；null 表示包含全部等级。 */
  level: EventLevel | null
}

export type EventActivityType =
  | 'CREATED' // 事件首次上报；由事件 createdAt 派生，不为海量 Mock 数据额外存储日志。
  | 'EDITED' // 事件类型、等级、位置描述或坐标被编辑。
  | 'STATUS_CHANGED' // 事件按处置状态机进入下一状态。

export interface EventActivity {
  id: string
  type: EventActivityType
  description: string
  /** ISO 8601 格式的操作发生时间。 */
  occurredAt: string
}
