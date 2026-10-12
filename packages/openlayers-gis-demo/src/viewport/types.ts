import type { InspectionEvent, InspectionEventFilter } from '../types/inspection-event'

/** WGS84 BBOX，顺序为最小经度、最小纬度、最大经度、最大纬度；四条边均包含。 */
export type Wgs84Bbox = readonly [
  minLongitude: number,
  minLatitude: number,
  maxLongitude: number,
  maxLatitude: number,
]

export interface ViewportEventQuery {
  /** 真实视口范围，按 [西, 南, 东, 北] 排列，单位为 WGS84 角度。 */
  bbox: Wgs84Bbox
  /** 与空间范围共同生效的业务筛选快照；Service 不应持有调用方对象引用。 */
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
  /** 重建完整数据集与空间索引；count 会向下取整并限制为非负数。 */
  setDatasetSize(count: number): ViewportDatasetBuildStats
  /** 异步查询真实视口事件；实现必须响应可选 AbortSignal。 */
  query(query: ViewportEventQuery): Promise<ViewportEventQueryResult>
  /** 清空查询缓存，但保留完整数据集与空间索引。 */
  clearCache(): void
  /** 释放缓存、数据集与索引；销毁后其他方法不得继续使用。 */
  destroy(): void
}

export type ViewportQueryStatus =
  | 'idle' // 尚未发起视口查询。
  | 'loading' // 正在查询；若已有成功结果则继续保留旧结果。
  | 'success' // 查询成功且至少返回一条事件。
  | 'empty' // 查询成功但当前视口没有匹配事件。
  | 'error' // 非取消错误；旧成功结果仍可继续展示。

export interface ViewportQueryParams {
  /** 本次查询使用的真实 WGS84 BBOX，边界包含。 */
  bbox: Wgs84Bbox
  /** 发起查询时的筛选快照，Controller 会复制后再交给 Service。 */
  filter: InspectionEventFilter
  /** 发起查询时调用方持有的数据集版本；只有同版本结果可以提交。 */
  expectedDatasetVersion: number
}

export interface ViewportQueryState {
  status: ViewportQueryStatus
  /** 最近一次成功或空查询结果；首次查询前为 null。 */
  result: ViewportEventQueryResult | null
  /** 面向用户的安全错误文案；没有普通错误时为 null。 */
  errorMessage: string | null
  /** Controller 内单调递增的请求序号；0 表示尚未查询。 */
  requestId: number
}

/** 校验 WGS84 BBOX 的有限性、全球范围和最小/最大边顺序；失败时抛出类型或范围错误。 */
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

/** 判断事件坐标是否位于 BBOX 闭区间内；落在任一边界上的事件同样视为命中。 */
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
