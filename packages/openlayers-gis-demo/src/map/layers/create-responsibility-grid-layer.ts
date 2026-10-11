import Feature from 'ol/Feature.js'
import Polygon from 'ol/geom/Polygon.js'
import VectorLayer from 'ol/layer/Vector.js'
import { fromLonLat } from 'ol/proj.js'
import VectorSource from 'ol/source/Vector.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'
import Text from 'ol/style/Text.js'

const GRID_COLUMNS = 4
const GRID_ROWS = 3
/** 网格覆盖范围按 [最小经度, 最小纬度, 最大经度, 最大纬度] 排列，边界均包含。 */
const GRID_WGS84_EXTENT: readonly [number, number, number, number] = [121.425, 31.19, 121.525, 31.27]

/** 创建演示责任网格；每个网格只表达空间责任范围，不参与用户绘制区域筛选。 */
export function createResponsibilityGridLayer() {
  const [minLng, minLat, maxLng, maxLat] = GRID_WGS84_EXTENT
  const lngStep = (maxLng - minLng) / GRID_COLUMNS
  const latStep = (maxLat - minLat) / GRID_ROWS
  const features: Feature<Polygon>[] = []

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const west = minLng + column * lngStep
      const east = west + lngStep
      const south = minLat + row * latStep
      const north = south + latStep
      const ring = [
        fromLonLat([west, south]),
        fromLonLat([east, south]),
        fromLonLat([east, north]),
        fromLonLat([west, north]),
        fromLonLat([west, south]),
      ]
      features.push(
        new Feature({
          geometry: new Polygon([ring]),
          gridId: `GRID-${row + 1}-${column + 1}`,
          // 相邻网格使用交替填充，帮助用户在复杂底图上辨认单元边界。
          gridTone: (row + column) % 2,
        }),
      )
    }
  }

  return new VectorLayer({
    properties: { layerId: 'responsibilityGrid' },
    source: new VectorSource({ features, wrapX: false }),
    style: (feature) => {
      const gridId = String(feature.get('gridId') ?? '')
      const gridTone = feature.get('gridTone') === 1
      return [
        // 外层深色实线提供对比底座，避免青色边界在亮色道路或热力高亮上消失。
        new Style({
          stroke: new Stroke({ color: '#020617cc', width: 4 }),
        }),
        new Style({
          fill: new Fill({ color: gridTone ? '#38bdf826' : '#0ea5e91a' }),
          stroke: new Stroke({ color: '#67e8f9', width: 1.8, lineDash: [8, 4] }),
          text: new Text({
            text: gridId,
            font: '600 12px sans-serif',
            fill: new Fill({ color: '#e0f2fe' }),
            backgroundFill: new Fill({ color: '#082f49e6' }),
            padding: [4, 7, 4, 7],
            overflow: true,
          }),
        }),
      ]
    },
    visible: false,
    // 网格应覆盖热力色块但低于事件点，确保分析图层叠加时仍可辨认且不遮挡业务标记。
    zIndex: 9,
  })
}
