import type { Wgs84Coordinate } from '../../types/region'
import { validateAnalysisGeometry } from './geometry-validation'

/** 国际大地测量与地球物理联合会采用的地球平均半径，单位为米。 */
export const EARTH_MEAN_RADIUS_METERS = 6_371_008.8

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180

function assertValidGeometry(
  geometry: Parameters<typeof validateAnalysisGeometry>[0],
): void {
  const result = validateAnalysisGeometry(geometry)
  if (!result.valid) throw new RangeError(result.reason)
}

/** 计算两个 WGS84 坐标之间的 Haversine 地表近似距离，单位为米。 */
export function calculateHaversineDistanceMeters(
  from: Wgs84Coordinate,
  to: Wgs84Coordinate,
): number {
  assertValidGeometry({ type: 'Point', coordinates: from })
  assertValidGeometry({ type: 'Point', coordinates: to })

  const latitudeFrom = degreesToRadians(from[1])
  const latitudeTo = degreesToRadians(to[1])
  const latitudeDelta = latitudeTo - latitudeFrom
  const longitudeDelta = degreesToRadians(to[0] - from[0])
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeFrom) * Math.cos(latitudeTo) * Math.sin(longitudeDelta / 2) ** 2

  // 浮点运算可能使 haversine 略超 1，夹取后避免 asin 得到 NaN。
  return 2 * EARTH_MEAN_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, haversine)))
}

/** 计算 WGS84 LineString 相邻分段的地表近似距离之和，单位为米。 */
export function calculateLineLengthMeters(coordinates: readonly Wgs84Coordinate[]): number {
  assertValidGeometry({ type: 'LineString', coordinates })
  let totalMeters = 0
  for (let index = 1; index < coordinates.length; index += 1) {
    totalMeters += calculateHaversineDistanceMeters(coordinates[index - 1], coordinates[index])
  }
  return totalMeters
}

function calculateRingSignedAreaSquareMeters(ring: readonly Wgs84Coordinate[]): number {
  let sum = 0
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [longitude, latitude] = ring[index]
    const [nextLongitude, nextLatitude] = ring[index + 1]
    sum +=
      degreesToRadians(nextLongitude - longitude) *
      (2 + Math.sin(degreesToRadians(latitude)) + Math.sin(degreesToRadians(nextLatitude)))
  }
  return (sum * EARTH_MEAN_RADIUS_METERS ** 2) / 2
}

/** 计算 Polygon 球面近似面积，首环面积减去所有洞面积，单位为平方米。 */
export function calculateSphericalPolygonAreaSquareMeters(
  rings: readonly (readonly Wgs84Coordinate[])[],
): number {
  assertValidGeometry({ type: 'Polygon', rings })
  const outerArea = Math.abs(calculateRingSignedAreaSquareMeters(rings[0]))
  const holesArea = rings
    .slice(1)
    .reduce((total, ring) => total + Math.abs(calculateRingSignedAreaSquareMeters(ring)), 0)
  return Math.max(0, outerArea - holesArea)
}

/** 计算 Polygon 所有环的地表边界长度之和，单位为米。 */
export function calculatePolygonPerimeterMeters(
  rings: readonly (readonly Wgs84Coordinate[])[],
): number {
  assertValidGeometry({ type: 'Polygon', rings })
  return rings.reduce((total, ring) => total + calculateLineLengthMeters(ring), 0)
}
