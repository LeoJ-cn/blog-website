import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import { selectedEventStyle } from '../styles/event-style'

export function createSelectionLayer() {
  // 选中标记始终复用同一个 Feature；没有 Geometry 时不会参与渲染和命中检测。
  const selectedFeature = new Feature<Point>()
  const source = new VectorSource({ features: [selectedFeature], wrapX: false })
  const layer = new VectorLayer({
    properties: { layerId: 'selection' },
    source,
    style: selectedEventStyle,
    // 高于事件、区域和轨迹图层，确保选中态不会被其他业务图形遮挡。
    zIndex: 40,
  })
  return { layer, source, selectedFeature }
}
