import Circle from 'ol/geom/Circle.js'
import type Geometry from 'ol/geom/Geometry.js'
import Polygon from 'ol/geom/Polygon.js'
import { fromLonLat, toLonLat } from 'ol/proj.js'
import type { RegionGeometry, Wgs84Coordinate } from '../types/region'

function toWgs84Coordinate(coordinate: number[]): Wgs84Coordinate {
  const lonLat = toLonLat(coordinate)
  return [lonLat[0]!, lonLat[1]!]
}

export function serializeRegionGeometry(geometry: Geometry): RegionGeometry | null {
  if (geometry instanceof Polygon) {
    return {
      type: 'Polygon',
      rings: geometry
        .getCoordinates()
        .map((ring) => ring.map((coordinate) => toWgs84Coordinate(coordinate))),
    }
  }
  if (geometry instanceof Circle) {
    const center = toWgs84Coordinate(geometry.getCenter())
    // Web Mercator 的局部比例尺为 sec(latitude)，乘 cos(latitude) 还原近似地表米数。
    const latitudeRadians = (center[1] * Math.PI) / 180
    return {
      type: 'Circle',
      center,
      radiusMeters: geometry.getRadius() * Math.cos(latitudeRadians),
    }
  }
  return null
}

export function deserializeRegionGeometry(regionGeometry: RegionGeometry): Polygon | Circle {
  if (regionGeometry.type === 'Polygon') {
    return new Polygon(
      regionGeometry.rings.map((ring) => ring.map((coordinate) => fromLonLat([...coordinate]))),
    )
  }
  const center = fromLonLat([...regionGeometry.center])
  const latitudeRadians = (regionGeometry.center[1] * Math.PI) / 180
  // 防止极区 cos(latitude) 接近 0；当前城市数据不会触及该边界，但协议仍需安全退化。
  const projectionScale = Math.max(Math.cos(latitudeRadians), 0.01)
  return new Circle(center, regionGeometry.radiusMeters / projectionScale)
}
