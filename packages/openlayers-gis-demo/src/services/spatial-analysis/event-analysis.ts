import type { InspectionEvent } from '../../types/inspection-event'
import type { AnalysisGeometry, SpatialEventStatistics } from '../../types/spatial-analysis'
import type { Wgs84Coordinate } from '../../types/region'
import type { Wgs84Bbox } from '../../viewport/types'
import { EARTH_MEAN_RADIUS_METERS, calculateHaversineDistanceMeters } from './measurement'
import { calculateEventRiskScore, HIGH_RISK_SCORE_THRESHOLD } from './risk-score'

type RegionGeometry = Extract<AnalysisGeometry, { type: 'Polygon' | 'Circle' }>

function isPointOnSegment(
  point: Wgs84Coordinate,
  start: Wgs84Coordinate,
  end: Wgs84Coordinate,
): boolean {
  const cross =
    (point[1] - start[1]) * (end[0] - start[0]) -
    (point[0] - start[0]) * (end[1] - start[1])
  if (Math.abs(cross) > 1e-10) return false
  return (
    point[0] >= Math.min(start[0], end[0]) &&
    point[0] <= Math.max(start[0], end[0]) &&
    point[1] >= Math.min(start[1], end[1]) &&
    point[1] <= Math.max(start[1], end[1])
  )
}

function getRingContainment(
  point: Wgs84Coordinate,
  ring: readonly Wgs84Coordinate[],
): 'outside' | 'inside' | 'boundary' {
  let inside = false
  for (let index = 0; index < ring.length - 1; index += 1) {
    const start = ring[index]
    const end = ring[index + 1]
    if (isPointOnSegment(point, start, end)) return 'boundary'
    const crossesLatitude = (start[1] > point[1]) !== (end[1] > point[1])
    if (!crossesLatitude) continue
    const crossingLongitude =
      ((end[0] - start[0]) * (point[1] - start[1])) / (end[1] - start[1]) + start[0]
    if (point[0] < crossingLongitude) inside = !inside
  }
  return inside ? 'inside' : 'outside'
}

/** 判断 WGS84 点是否位于区域内；Polygon 外边界包含，洞及洞边界排除。 */
export function isPointInsideRegion(point: Wgs84Coordinate, geometry: RegionGeometry): boolean {
  if (geometry.type === 'Circle') {
    return calculateHaversineDistanceMeters(point, geometry.center) <= geometry.radiusMeters
  }
  const outerContainment = getRingContainment(point, geometry.rings[0])
  if (outerContainment === 'outside') return false
  return geometry.rings.slice(1).every((ring) => getRingContainment(point, ring) === 'outside')
}

/** 返回覆盖区域的一个或两个 WGS84 BBOX；跨日期变更线的 Circle 会拆成两段。 */
export function calculateRegionBboxes(geometry: RegionGeometry): readonly Wgs84Bbox[] {
  if (geometry.type === 'Polygon') {
    const coordinates = geometry.rings.flat()
    const longitudes = coordinates.map((coordinate) => coordinate[0])
    const latitudes = coordinates.map((coordinate) => coordinate[1])
    return [[Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)]]
  }

  const latitudeDelta = (geometry.radiusMeters / EARTH_MEAN_RADIUS_METERS) * (180 / Math.PI)
  const minLatitude = Math.max(-90, geometry.center[1] - latitudeDelta)
  const maxLatitude = Math.min(90, geometry.center[1] + latitudeDelta)
  const cosineLatitude = Math.cos((geometry.center[1] * Math.PI) / 180)
  const longitudeDelta =
    cosineLatitude <= Number.EPSILON ? 180 : Math.min(180, latitudeDelta / cosineLatitude)
  const minLongitude = geometry.center[0] - longitudeDelta
  const maxLongitude = geometry.center[0] + longitudeDelta
  if (longitudeDelta >= 180) return [[-180, minLatitude, 180, maxLatitude]]
  if (minLongitude < -180) {
    return [
      [minLongitude + 360, minLatitude, 180, maxLatitude],
      [-180, minLatitude, maxLongitude, maxLatitude],
    ]
  }
  if (maxLongitude > 180) {
    return [
      [minLongitude, minLatitude, 180, maxLatitude],
      [-180, minLatitude, maxLongitude - 360, maxLatitude],
    ]
  }
  return [[minLongitude, minLatitude, maxLongitude, maxLatitude]]
}

/** 汇总区域事件状态、等级、类型和演示风险分。 */
export function calculateEventStatistics(
  events: readonly InspectionEvent[],
  nowTimestamp: number,
): SpatialEventStatistics {
  if (!Number.isFinite(nowTimestamp)) throw new TypeError('风险评分基准时间必须是有限毫秒时间戳')
  const statusCounts = { PENDING: 0, PROCESSING: 0, DONE: 0 }
  const levelCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 }
  const typeCounts = { ROAD_DAMAGE: 0, LIGHT_FAILURE: 0, GARBAGE: 0, MANHOLE: 0 }
  const highRiskEventIds: string[] = []
  let riskScore = 0

  for (const event of events) {
    statusCounts[event.status] += 1
    levelCounts[event.level] += 1
    typeCounts[event.type] += 1
    const eventRiskScore = calculateEventRiskScore(event, nowTimestamp)
    riskScore += eventRiskScore
    if (eventRiskScore >= HIGH_RISK_SCORE_THRESHOLD) highRiskEventIds.push(event.id)
  }

  highRiskEventIds.sort()
  return { eventCount: events.length, statusCounts, levelCounts, typeCounts, riskScore, highRiskEventIds }
}
