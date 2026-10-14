import type {
  AnalysisGeometry,
  GeometryValidationResult,
  SpatialAnalysisFailureReason,
} from '../../types/spatial-analysis'
import type { Wgs84Coordinate } from '../../types/region'

function invalid(reason: SpatialAnalysisFailureReason): GeometryValidationResult {
  return { valid: false, reason }
}

function validateCoordinate(coordinate: Wgs84Coordinate): GeometryValidationResult {
  const [longitude, latitude] = coordinate
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return invalid('NON_FINITE_COORDINATE')
  }
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    return invalid('COORDINATE_OUT_OF_RANGE')
  }
  return { valid: true }
}

function validateCoordinates(coordinates: readonly Wgs84Coordinate[]): GeometryValidationResult {
  for (const coordinate of coordinates) {
    const result = validateCoordinate(coordinate)
    if (!result.valid) return result
  }
  return { valid: true }
}

function validatePolygon(rings: readonly (readonly Wgs84Coordinate[])[]): GeometryValidationResult {
  if (rings.length === 0) return invalid('POLYGON_REQUIRES_RING')

  for (const ring of rings) {
    if (ring.length < 4) return invalid('POLYGON_RING_REQUIRES_FOUR_POINTS')
    const coordinatesResult = validateCoordinates(ring)
    if (!coordinatesResult.valid) return coordinatesResult

    const first = ring[0]
    const last = ring[ring.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) {
      return invalid('POLYGON_RING_NOT_CLOSED')
    }

    // 经度差大于 180° 表示路径经过日期变更线；第一阶段明确拒绝该边界，避免面积歧义。
    for (let index = 1; index < ring.length; index += 1) {
      if (Math.abs(ring[index][0] - ring[index - 1][0]) > 180) {
        return invalid('ANTIMERIDIAN_NOT_SUPPORTED')
      }
    }
  }

  return { valid: true }
}

/** 校验可序列化分析几何，并以稳定原因描述首个失败边界。 */
export function validateAnalysisGeometry(geometry: AnalysisGeometry): GeometryValidationResult {
  switch (geometry.type) {
    case 'Point':
      return validateCoordinate(geometry.coordinates)
    case 'LineString':
      if (geometry.coordinates.length < 2) return invalid('LINE_REQUIRES_TWO_POINTS')
      return validateCoordinates(geometry.coordinates)
    case 'Polygon':
      return validatePolygon(geometry.rings)
    case 'Circle': {
      const centerResult = validateCoordinate(geometry.center)
      if (!centerResult.valid) return centerResult
      if (!Number.isFinite(geometry.radiusMeters) || geometry.radiusMeters <= 0) {
        return invalid('RADIUS_NOT_POSITIVE')
      }
      return { valid: true }
    }
  }
}
