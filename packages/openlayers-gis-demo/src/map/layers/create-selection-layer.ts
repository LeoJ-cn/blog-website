import Feature from 'ol/Feature.js' // OpenLayers 要素容器，用一个独立要素表示当前选中位置。
import Point from 'ol/geom/Point.js' // OpenLayers 点几何，保存选中事件的投影坐标。
import VectorLayer from 'ol/layer/Vector.js' // OpenLayers 矢量图层，将选中标记绘制在业务图层上方。
import VectorSource from 'ol/source/Vector.js' // OpenLayers 矢量数据源，仅保存可复用的选中要素。
import { selectedEventStyle } from '../styles/event-style'

export function createSelectionLayer() {
  // 选中标记始终复用同一个 Feature；没有 Geometry 时不会参与渲染和命中检测。
  const selectedFeature = new Feature<Point>()
  // features 注册初始要素；wrapX=false 禁止选中标记跨世界副本重复显示。
  const source = new VectorSource({ features: [selectedFeature], wrapX: false })
  // VectorLayer 使用固定 selectedEventStyle 绘制唯一的选中 Feature。
  const layer = new VectorLayer({
    properties: { layerId: 'selection' },
    source,
    style: selectedEventStyle,
    // 高于事件、区域和轨迹图层，确保选中态不会被其他业务图形遮挡。
    zIndex: 40,
  })
  return { layer, source, selectedFeature }
}
