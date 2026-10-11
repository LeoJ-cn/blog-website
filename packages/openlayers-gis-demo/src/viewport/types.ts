import type { InspectionEvent } from '../types/inspection-event'

/** WGS84 BBOX，顺序为最小经度、最小纬度、最大经度、最大纬度；四条边均包含。 */
export type Wgs84Bbox = readonly [
  minLongitude: number,
  minLatitude: number,
  maxLongitude: number,
  maxLatitude: number,
]

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
