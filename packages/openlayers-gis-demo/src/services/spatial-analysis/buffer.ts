import type { AnalysisGeometry } from '../../types/spatial-analysis'
import type { Wgs84Coordinate } from '../../types/region'
import { validateAnalysisGeometry } from './geometry-validation'
import { EARTH_MEAN_RADIUS_METERS } from './measurement'

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180
const radiansToDegrees = (radians: number): number => (radians * 180) / Math.PI

/**
 * 按球面目标点公式生成城市尺度缓冲区 Polygon。
 * 采样数必须为至少 16 的整数；返回环包含追加的首点，因此坐标数为 segmentCount + 1。
 */
export function createWgs84BufferPolygon(
  center: Wgs84Coordinate,
  radiusMeters: number,
  segmentCount = 64,
): Extract<AnalysisGeometry, { type: 'Polygon' }> {
  const centerResult = validateAnalysisGeometry({ type: 'Point', coordinates: center })
  if (!centerResult.valid) throw new RangeError(centerResult.reason)
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new RangeError('RADIUS_NOT_POSITIVE')
  }
  if (!Number.isInteger(segmentCount) || segmentCount < 16) {
    throw new RangeError('BUFFER_SEGMENT_COUNT_INVALID')
  }

  const angularDistance = radiusMeters / EARTH_MEAN_RADIUS_METERS
  const centerLongitude = degreesToRadians(center[0])
  const centerLatitude = degreesToRadians(center[1])
  const ring: Wgs84Coordinate[] = []

  for (let index = 0; index < segmentCount; index += 1) {
    const bearing = (2 * Math.PI * index) / segmentCount
    const latitude = Math.asin(
      Math.sin(centerLatitude) * Math.cos(angularDistance) +
        Math.cos(centerLatitude) * Math.sin(angularDistance) * Math.cos(bearing),
    )
    const longitude =
      centerLongitude +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(centerLatitude),
        Math.cos(angularDistance) - Math.sin(centerLatitude) * Math.sin(latitude),
      )
    // 将经度归一化到 [-180, 180)，保证输出符合 WGS84 坐标协议。
    const normalizedLongitude = ((radiansToDegrees(longitude) + 540) % 360) - 180
    ring.push([normalizedLongitude, radiansToDegrees(latitude)])
  }

  ring.push(ring[0])
  const polygon: Extract<AnalysisGeometry, { type: 'Polygon' }> = { type: 'Polygon', rings: [ring] }
  const polygonResult = validateAnalysisGeometry(polygon)
  if (!polygonResult.valid) throw new RangeError(polygonResult.reason)
  return polygon
}
