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
type GridCoverageState = 'pending' | 'current' | 'visited'

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
          // 轨迹按南到北蛇形巡检；序号从 0 开始，对应 mock 轨迹采样点顺序。
          gridSequence: row % 2 === 0 ? row * GRID_COLUMNS + column : row * GRID_COLUMNS + 3 - column,
          coverageState: 'pending',
          // 相邻网格使用交替填充，帮助用户在复杂底图上辨认单元边界。
          gridTone: (row + column) % 2,
        }),
      )
    }
  }

  const layer = new VectorLayer({
    properties: { layerId: 'responsibilityGrid' },
    source: new VectorSource({ features, wrapX: false }),
    style: (feature) => {
      const gridId = String(feature.get('gridId') ?? '')
      const gridTone = feature.get('gridTone') === 1
      const coverageState = String(feature.get('coverageState') ?? 'pending') as GridCoverageState
      const isVisited = coverageState === 'visited'
      const isCurrent = coverageState === 'current'
      return [
        // 外层深色实线提供对比底座，避免青色边界在亮色道路或热力高亮上消失。
        new Style({
          stroke: new Stroke({ color: '#020617cc', width: 4 }),
        }),
        new Style({
          fill: new Fill({
            color: isCurrent
              ? '#fbbf2447'
              : isVisited
                ? '#22c55e38'
                : gridTone
                  ? '#38bdf826'
                  : '#0ea5e91a',
          }),
          stroke: new Stroke({
            color: isCurrent ? '#fbbf24' : isVisited ? '#4ade80' : '#67e8f9',
            width: isCurrent ? 3 : 1.8,
            lineDash: isVisited || isCurrent ? undefined : [8, 4],
          }),
          text: new Text({
            text: `${isVisited ? '✓ ' : isCurrent ? '● ' : ''}${gridId}`,
            font: '600 12px sans-serif',
            fill: new Fill({ color: isCurrent ? '#fef3c7' : isVisited ? '#dcfce7' : '#e0f2fe' }),
            backgroundFill: new Fill({
              color: isCurrent ? '#78350fe6' : isVisited ? '#14532de6' : '#082f49e6',
            }),
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

  return {
    layer,
    /** activeSequence 为当前轨迹点的零基序号；null 表示退出复盘并恢复普通责任网格。 */
    setCoverageProgress(activeSequence: number | null) {
      if (activeSequence === null) {
        for (const feature of features) feature.set('coverageState', 'pending', true)
        layer.changed()
        return
      }
      const normalizedSequence = Math.min(
        GRID_COLUMNS * GRID_ROWS - 1,
        Math.max(0, Math.floor(activeSequence)),
      )
      for (const feature of features) {
        const sequence = Number(feature.get('gridSequence'))
        const nextState: GridCoverageState =
          sequence < normalizedSequence
            ? 'visited'
            : sequence === normalizedSequence
              ? 'current'
              : 'pending'
        feature.set('coverageState', nextState, true)
      }
      layer.changed()
    },
  }
}
