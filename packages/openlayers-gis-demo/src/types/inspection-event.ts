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
