import type { InspectionEvent, InspectionEventFilter } from '../types/inspection-event'

/** WGS84 BBOX，顺序为最小经度、最小纬度、最大经度、最大纬度；四条边均包含。 */
export type Wgs84Bbox = readonly [
  minLongitude: number,
  minLatitude: number,
  maxLongitude: number,
  maxLatitude: number,
]

export interface ViewportEventQuery {
  bbox: Wgs84Bbox
  filter: InspectionEventFilter
  /** 可选取消信号；取消必须以 name 为 AbortError 的错误结束。 */
  signal?: AbortSignal
}

export interface ViewportDatasetBuildStats {
  /** Mock 完整数据集的事件数量。 */
  datasetSize: number
  /** 每次重建数据集递增的版本号，从 1 开始。 */
  datasetVersion: number
  /** 生成完整 Mock 数据的同步耗时，单位为毫秒。 */
  generationDurationMs: number
  /** 构建固定网格索引的同步耗时，单位为毫秒。 */
  indexBuildDurationMs: number
  /** 至少包含一个事件的网格数量。 */
  indexedCellCount: number
}

export interface ViewportEventQueryResult {
  /** 当前真实 BBOX 和业务筛选共同命中的事件副本。 */
  events: InspectionEvent[]
  /** 查询所属完整 Mock 数据集的事件数量。 */
  datasetSize: number
  /** 查询所属的数据集版本号。 */
  datasetVersion: number
  /** 空间索引在量化 BBOX 中返回的候选事件数量。 */
  candidateCount: number
  /** 当前真实 BBOX 和业务筛选共同命中的事件数量。 */
  matchedCount: number
  /** 不含模拟网络延迟的纯查询耗时，单位为毫秒。 */
  queryDurationMs: number
  /** 是否复用了相同版本、量化 BBOX 与业务筛选的缓存。 */
  cacheHit: boolean
}

export interface ViewportEventService {
  setDatasetSize(count: number): ViewportDatasetBuildStats
  query(query: ViewportEventQuery): Promise<ViewportEventQueryResult>
  clearCache(): void
  destroy(): void
}

export function validateWgs84Bbox(_bbox: Wgs84Bbox): void {
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = _bbox

  if (!_bbox.every(Number.isFinite)) {
    throw new TypeError('WGS84 BBOX 的所有坐标都必须是有限数值')
  }
  if (minLongitude < -180 || maxLongitude > 180) {
    throw new RangeError('WGS84 BBOX 经度必须位于 -180 到 180 之间')
  }
  if (minLatitude < -90 || maxLatitude > 90) {
    throw new RangeError('WGS84 BBOX 纬度必须位于 -90 到 90 之间')
  }
  if (minLongitude > maxLongitude || minLatitude > maxLatitude) {
    throw new RangeError('WGS84 BBOX 的最小坐标不能大于最大坐标')
  }
}

export function isEventInsideBbox(_event: InspectionEvent, _bbox: Wgs84Bbox): boolean {
  validateWgs84Bbox(_bbox)
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = _bbox
  return (
    _event.lng >= minLongitude &&
    _event.lng <= maxLongitude &&
    _event.lat >= minLatitude &&
    _event.lat <= maxLatitude
  )
}
