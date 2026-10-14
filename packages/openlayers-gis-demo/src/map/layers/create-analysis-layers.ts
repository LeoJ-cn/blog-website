import CircleStyle from 'ol/style/Circle.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'

/** 创建输入、结果和命中高亮三个互不共享 Feature 的分析图层。 */
export function createAnalysisLayers() {
  const inputSource = new VectorSource({ wrapX: false })
  const resultSource = new VectorSource({ wrapX: false })
  const highlightSource = new VectorSource({ wrapX: false })
  const inputStyle = new Style({
    stroke: new Stroke({ color: '#38bdf8', width: 3, lineDash: [8, 6] }),
    fill: new Fill({ color: 'rgba(56, 189, 248, 0.12)' }),
    image: new CircleStyle({ radius: 7, fill: new Fill({ color: '#38bdf8' }), stroke: new Stroke({ color: '#fff', width: 2 }) }),
  })
  const resultStyle = new Style({
    stroke: new Stroke({ color: '#f59e0b', width: 3 }),
    fill: new Fill({ color: 'rgba(245, 158, 11, 0.16)' }),
    image: new CircleStyle({ radius: 7, fill: new Fill({ color: '#f59e0b' }), stroke: new Stroke({ color: '#fff', width: 2 }) }),
  })
  const highlightStyle = new Style({
    image: new CircleStyle({ radius: 9, fill: new Fill({ color: 'rgba(239, 68, 68, 0.72)' }), stroke: new Stroke({ color: '#fff', width: 2 }) }),
  })
  return {
    inputSource,
    resultSource,
    highlightSource,
    inputLayer: new VectorLayer({ source: inputSource, style: inputStyle, zIndex: 31 }),
    resultLayer: new VectorLayer({ source: resultSource, style: resultStyle, zIndex: 32 }),
    highlightLayer: new VectorLayer({ source: highlightSource, style: highlightStyle, zIndex: 41 }),
  }
}
