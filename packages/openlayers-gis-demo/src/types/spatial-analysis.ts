import type { EventLevel, EventStatus, EventType } from './inspection-event'
import type { Wgs84Coordinate } from './region'

/** 空间分析能力的稳定业务标识；调用方应按成员判别输入与结果。 */
export type SpatialAnalysisKind =
  | 'DISTANCE' // 对 LineString 求地表近似距离，结果单位为米。
  | 'AREA' // 对 Polygon 求球面近似面积，结果单位为平方米。
  | 'BUFFER' // 以 Point 为圆心、指定米制半径生成球面近似 Polygon。
  | 'NEAREST_EVENTS' // 从完整数据集中查询距离 Point 最近的事件。
  | 'REGION_STATISTICS' // 统计 Polygon 或 Circle 内的事件及演示风险分。
  | 'REGION_COMPARISON' // 比较两个 Polygon 或 Circle 的事件集合和统计。

/** 可序列化 WGS84 分析几何；坐标顺序固定为 [经度, 纬度]，单位为度。 */
export type AnalysisGeometry =
  | {
      type: 'Point'
      /** WGS84 坐标；经度闭区间 [-180, 180]，纬度闭区间 [-90, 90]。 */
      coordinates: Wgs84Coordinate
    }
  | {
      type: 'LineString'
      /** 至少两个 WGS84 坐标，按路径顺序排列。 */
      coordinates: readonly Wgs84Coordinate[]
    }
  | {
      type: 'Polygon'
      /** 首环为外环、后续环为洞；每个环至少四点且首尾坐标完全相同。 */
      rings: readonly (readonly Wgs84Coordinate[])[]
    }
  | {
      type: 'Circle'
      /** WGS84 圆心，顺序为 [经度, 纬度]，单位为度。 */
      center: Wgs84Coordinate
      /** 地表半径，单位为米，必须为有限正数。 */
      radiusMeters: number
    }

/** 几何与分析参数校验的稳定失败原因；调用方不得依赖展示文案判断分支。 */
export type SpatialAnalysisFailureReason =
  | 'NON_FINITE_COORDINATE' // 经度或纬度不是有限数值。
  | 'COORDINATE_OUT_OF_RANGE' // 经度或纬度超出 WGS84 合法闭区间。
  | 'LINE_REQUIRES_TWO_POINTS' // LineString 少于两个坐标。
  | 'POLYGON_REQUIRES_RING' // Polygon 不包含外环。
  | 'POLYGON_RING_REQUIRES_FOUR_POINTS' // Polygon 任一环少于四个坐标。
  | 'POLYGON_RING_NOT_CLOSED' // Polygon 任一环首尾坐标不完全相同。
  | 'ANTIMERIDIAN_NOT_SUPPORTED' // Polygon 相邻点跨越 180° 经线，当前算法不支持。
  | 'RADIUS_NOT_POSITIVE' // Circle 或缓冲区半径不是有限正数。
  | 'BUFFER_SEGMENT_COUNT_INVALID' // 缓冲区采样数不是大于或等于 16 的整数。
  | 'NEAREST_LIMIT_OUT_OF_RANGE' // 最近事件数量不在闭区间 [1, 100]。

export type GeometryValidationResult =
  | { valid: true }
  | {
      valid: false
      /** 可供程序稳定判断的失败原因。 */
      reason: SpatialAnalysisFailureReason
    }

export type SpatialAnalysisInput =
  | { kind: 'DISTANCE'; geometry: Extract<AnalysisGeometry, { type: 'LineString' }> }
  | { kind: 'AREA'; geometry: Extract<AnalysisGeometry, { type: 'Polygon' }> }
  | {
      kind: 'BUFFER'
      geometry: Extract<AnalysisGeometry, { type: 'Point' }>
      /** 缓冲区地表半径，单位为米，必须为有限正数。 */
      radiusMeters: number
    }
  | {
      kind: 'NEAREST_EVENTS'
      geometry: Extract<AnalysisGeometry, { type: 'Point' }>
      /** 返回事件数量，取值为闭区间 [1, 100] 的整数。 */
      limit: number
    }
  | {
      kind: 'REGION_STATISTICS'
      geometry: Extract<AnalysisGeometry, { type: 'Polygon' | 'Circle' }>
      /** 评分基准时间，Unix 时间戳，单位为毫秒。 */
      nowTimestamp: number
    }
  | {
      kind: 'REGION_COMPARISON'
      geometryA: Extract<AnalysisGeometry, { type: 'Polygon' | 'Circle' }>
      geometryB: Extract<AnalysisGeometry, { type: 'Polygon' | 'Circle' }>
      /** 评分基准时间，Unix 时间戳，单位为毫秒。 */
      nowTimestamp: number
    }

export interface SpatialEventStatistics {
  /** 区域内事件总数。 */
  eventCount: number
  /** 按处置状态统计的事件数量。 */
  statusCounts: Readonly<Record<EventStatus, number>>
  /** 按调度等级统计的事件数量。 */
  levelCounts: Readonly<Record<EventLevel, number>>
  /** 按业务分类统计的事件数量。 */
  typeCounts: Readonly<Record<EventType, number>>
  /** 演示风险分总和，不表达真实公共安全结论。 */
  riskScore: number
  /** 达到高风险阈值的稳定事件 ID，按码元升序排列。 */
  highRiskEventIds: readonly string[]
}

interface EventHighlightResult {
  /** 完整命中事件 ID；只保存 ID，不复制事件对象。 */
  eventIds: readonly string[]
  /** 地图可视高亮事件 ID，最多 2,000 个。 */
  highlightEventIds: readonly string[]
  /** true 表示命中数量超过 2,000，地图只表达截断后的高亮集合。 */
  highlightTruncated: boolean
}

/** 空间分析结果；距离使用米、面积使用平方米，并按 kind 判别。 */
export type SpatialAnalysisResult =
  | {
      kind: 'DISTANCE'
      geometry: Extract<AnalysisGeometry, { type: 'LineString' }>
      /** 各相邻点之间的地表近似距离，单位为米，顺序与路径分段一致。 */
      segmentLengthsMeters: readonly number[]
      /** 所有分段长度之和，单位为米。 */
      totalLengthMeters: number
    }
  | {
      kind: 'AREA'
      geometry: Extract<AnalysisGeometry, { type: 'Polygon' }>
      /** 外环减洞后的球面近似面积，单位为平方米且不会小于 0。 */
      areaSquareMeters: number
      /** 所有环边界长度之和，单位为米。 */
      perimeterMeters: number
    }
  | {
      kind: 'BUFFER'
      /** 球面采样生成且首尾闭合的缓冲区 Polygon。 */
      geometry: Extract<AnalysisGeometry, { type: 'Polygon' }>
      /** 生成缓冲区使用的地表半径，单位为米。 */
      radiusMeters: number
    }
  | (EventHighlightResult & {
      kind: 'NEAREST_EVENTS'
      /** 最近事件及其地表近似距离，按距离、事件 ID 依次升序排列。 */
      matches: readonly { eventId: string; distanceMeters: number }[]
    })
  | (EventHighlightResult & {
      kind: 'REGION_STATISTICS'
      geometry: Extract<AnalysisGeometry, { type: 'Polygon' | 'Circle' }>
      statistics: SpatialEventStatistics
    })
  | {
      kind: 'REGION_COMPARISON'
      geometryA: Extract<AnalysisGeometry, { type: 'Polygon' | 'Circle' }>
      geometryB: Extract<AnalysisGeometry, { type: 'Polygon' | 'Circle' }>
      /** 仅区域 A 命中的事件 ID，按码元升序排列。 */
      onlyAEventIds: readonly string[]
      /** 两个区域共同命中的事件 ID，按码元升序排列。 */
      sharedEventIds: readonly string[]
      /** 仅区域 B 命中的事件 ID，按码元升序排列。 */
      onlyBEventIds: readonly string[]
      statisticsA: SpatialEventStatistics
      statisticsB: SpatialEventStatistics
      /** 地图可视高亮事件 ID，最多 2,000 个。 */
      highlightEventIds: readonly string[]
      /** true 表示对比集合超过 2,000，地图只表达截断后的高亮集合。 */
      highlightTruncated: boolean
    }
