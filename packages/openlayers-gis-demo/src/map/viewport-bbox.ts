import type { Extent } from 'ol/extent.js' // OpenLayers 范围元组类型，顺序为 [minX, minY, maxX, maxY]。
import { transformExtent } from 'ol/proj.js' // 在不同坐标参考系之间转换完整范围。
import { validateWgs84Bbox, type Wgs84Bbox } from '../viewport/types'

export function calculateWgs84ViewportBbox(
  projectedExtent: Extent,
  projectionCode: string,
): Wgs84Bbox {
  if (projectedExtent.length < 4 || !projectedExtent.slice(0, 4).every(Number.isFinite)) {
    throw new TypeError('地图视口 extent 必须包含四个有限坐标')
  }
  const [minX, minY, maxX, maxY] = projectedExtent
  if (minX! > maxX! || minY! > maxY!) {
    throw new RangeError('地图视口 extent 的最小坐标不能大于最大坐标')
  }

  // transformExtent(extent, source, destination) 会转换范围四角并返回目标投影下的包围盒；
  // projectedExtent 使用当前 View 投影，projectionCode 是源 EPSG 编码，EPSG:4326 是目标经纬度坐标系。
  const transformed = transformExtent(projectedExtent, projectionCode, 'EPSG:4326')
  const bbox: Wgs84Bbox = [
    Math.max(-180, transformed[0]!),
    Math.max(-90, transformed[1]!),
    Math.min(180, transformed[2]!),
    Math.min(90, transformed[3]!),
  ]
  validateWgs84Bbox(bbox)
  return bbox
}
