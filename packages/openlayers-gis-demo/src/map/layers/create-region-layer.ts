import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'

export function createRegionLayer() {
  const source = new VectorSource({ wrapX: false })
  const layer = new VectorLayer({
    properties: { layerId: 'region' },
    source,
    style: new Style({
      fill: new Fill({ color: '#38bdf826' }),
      // lineDash 按 [实线像素长度, 间隔像素长度] 排列，突出可编辑区域边界。
      stroke: new Stroke({ color: '#38bdf8', width: 2, lineDash: [8, 5] }),
    }),
    zIndex: 20,
  })
  return { layer, source }
}
