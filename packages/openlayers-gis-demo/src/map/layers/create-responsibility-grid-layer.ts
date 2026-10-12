import Feature from 'ol/Feature.js' // OpenLayers 要素容器，关联责任网格几何与业务属性。
import Polygon from 'ol/geom/Polygon.js' // OpenLayers 多边形几何，表示责任网格的闭合边界。
import VectorLayer from 'ol/layer/Vector.js' // OpenLayers 矢量图层，绘制全部责任网格要素。
import { fromLonLat } from 'ol/proj.js' // 将网格 WGS84 经纬度转换为地图投影坐标。
import VectorSource from 'ol/source/Vector.js' // OpenLayers 矢量数据源，保存并索引责任网格要素。
import Fill from 'ol/style/Fill.js' // OpenLayers 填充样式，按覆盖进度控制网格内部颜色。
import Stroke from 'ol/style/Stroke.js' // OpenLayers 描边样式，绘制责任网格边界。
import Style from 'ol/style/Style.js' // OpenLayers 要素样式容器，组合网格图形与标签。
import Text from 'ol/style/Text.js' // OpenLayers 文本样式，用于显示责任网格名称。

const GRID_COLUMNS = 4
const GRID_ROWS = 3
/** 网格覆盖范围按 [最小经度, 最小纬度, 最大经度, 最大纬度] 排列，边界均包含。 */
const GRID_WGS84_EXTENT: readonly [number, number, number, number] = [
  121.425, 31.19, 121.525, 31.27,
]
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
      // fromLonLat 接收 [经度, 纬度]；首尾点相同以形成 Polygon 要求的闭合外环。
      const ring = [
        fromLonLat([west, south]),
        fromLonLat([east, south]),
        fromLonLat([east, north]),
        fromLonLat([west, north]),
        fromLonLat([west, south]),
      ]
      features.push(
        // Feature 配置同时接受 geometry 与业务属性；Polygon([ring]) 的第一项是外环。
        new Feature({
          geometry: new Polygon([ring]),
          gridId: `GRID-${row + 1}-${column + 1}`,
          // 轨迹按南到北蛇形巡检；序号从 0 开始，对应 mock 轨迹采样点顺序。
          gridSequence:
            row % 2 === 0 ? row * GRID_COLUMNS + column : row * GRID_COLUMNS + 3 - column,
          coverageState: 'pending',
          // 相邻网格使用交替填充，帮助用户在复杂底图上辨认单元边界。
          gridTone: (row + column) % 2,
        }),
      )
    }
  }

  // VectorLayer 绘制责任网格；内部 VectorSource 以 features 初始化，wrapX=false 禁止世界副本重复。
  const layer = new VectorLayer({
    properties: { layerId: 'responsibilityGrid' },
    source: new VectorSource({ features, wrapX: false }),
    // style(feature) 在渲染时按 coverageState 返回两层 Style，动态表达巡检进度。
    style: (feature) => {
      // get(key) 读取创建 Feature 时写入的自定义属性。
      const gridId = String(feature.get('gridId') ?? '')
      const gridTone = feature.get('gridTone') === 1
      const coverageState = String(feature.get('coverageState') ?? 'pending') as GridCoverageState
      const isVisited = coverageState === 'visited'
      const isCurrent = coverageState === 'current'
      return [
        // 外层深色实线提供对比底座，避免青色边界在亮色道路或热力高亮上消失。
        new Style({
          // Stroke.color 是 CSS 颜色，width 单位为像素；第一层仅绘制深色外轮廓。
          stroke: new Stroke({ color: '#020617cc', width: 4 }),
        }),
        new Style({
          // Fill.color 控制面颜色；Stroke.lineDash 按 [实线长度, 间隔长度]，单位为像素。
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
          // Text 配置网格标签：text 内容、font 字体、fill 字色、backgroundFill 背景色。
          text: new Text({
            text: `${isVisited ? '✓ ' : isCurrent ? '● ' : ''}${gridId}`,
            font: '600 11px sans-serif',
            fill: new Fill({ color: isCurrent ? '#fef3c7' : isVisited ? '#dcfce7' : '#e0f2fe' }),
            backgroundFill: new Fill({
              color: isCurrent ? '#78350fe6' : isVisited ? '#14532de6' : '#082f49e6',
            }),
            // padding 顺序为 [上, 右, 下, 左]，单位为屏幕像素。
            padding: [3, 5, 3, 5],
            // 标签必须完整容纳在对应网格内，避免相邻单元文字连成一条横幅。
            overflow: false,
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
        // set(key, value, silent=true) 静默批量写属性，最后只调用一次 layer.changed() 重绘。
        for (const feature of features) feature.set('coverageState', 'pending', true)
        layer.changed()
        return
      }
      const normalizedSequence = Math.min(
        GRID_COLUMNS * GRID_ROWS - 1,
        Math.max(0, Math.floor(activeSequence)),
      )
      for (const feature of features) {
        // get 读取网格序号；set 的 silent=true 避免每个 Feature 分别触发渲染。
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
