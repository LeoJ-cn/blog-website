import Circle from 'ol/geom/Circle.js' // OpenLayers 圆几何，保存投影坐标系中的圆心和半径。
import type Geometry from 'ol/geom/Geometry.js' // OpenLayers 几何基类，用于接收不同区域几何实现。
import Polygon from 'ol/geom/Polygon.js' // OpenLayers 多边形几何，保存闭合区域的投影坐标环。
import { fromLonLat, toLonLat } from 'ol/proj.js' // 在 WGS84 经纬度与地图投影坐标之间双向转换。
import type { RegionGeometry, Wgs84Coordinate } from '../types/region'

function toWgs84Coordinate(coordinate: number[]): Wgs84Coordinate {
  // toLonLat(coordinate) 将 View 投影坐标转换为 [经度, 纬度]；未传 projection 时源投影默认 EPSG:3857。
  const lonLat = toLonLat(coordinate)
  return [lonLat[0]!, lonLat[1]!]
}

/** 将 OpenLayers Polygon/Circle 转为可持久化 WGS84 协议；其他几何返回 null。 */
export function serializeRegionGeometry(geometry: Geometry): RegionGeometry | null {
  if (geometry instanceof Polygon) {
    // getCoordinates() 返回 Polygon 的坐标环数组；每个环均逐点转换为可持久化的 WGS84 经纬度。
    return {
      type: 'Polygon',
      rings: geometry
        .getCoordinates()
        .map((ring) => ring.map((coordinate) => toWgs84Coordinate(coordinate))),
    }
  }
  if (geometry instanceof Circle) {
    // getCenter() 返回投影坐标，getRadius() 返回相同投影单位下的半径。
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

/** 将可序列化 WGS84 区域恢复为默认 Web Mercator 下的 OpenLayers Geometry。 */
export function deserializeRegionGeometry(regionGeometry: RegionGeometry): Polygon | Circle {
  if (regionGeometry.type === 'Polygon') {
    // Polygon(coordinates) 接收“坐标环 → 坐标点”的嵌套数组；fromLonLat 将每点投影到 EPSG:3857。
    return new Polygon(
      regionGeometry.rings.map((ring) => ring.map((coordinate) => fromLonLat([...coordinate]))),
    )
  }
  // fromLonLat([longitude, latitude]) 将 WGS84 圆心转换为 Circle 所需的默认 View 投影坐标。
  const center = fromLonLat([...regionGeometry.center])
  const latitudeRadians = (regionGeometry.center[1] * Math.PI) / 180
  // 防止极区 cos(latitude) 接近 0；当前城市数据不会触及该边界，但协议仍需安全退化。
  const projectionScale = Math.max(Math.cos(latitudeRadians), 0.01)
  // Circle(center, radius) 的半径采用投影坐标单位；除以局部比例系数还原 Web Mercator 投影半径。
  return new Circle(center, regionGeometry.radiusMeters / projectionScale)
}
