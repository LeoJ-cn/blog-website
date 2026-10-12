import VectorLayer from 'ol/layer/Vector.js' // OpenLayers 矢量图层，将事件数据源中的要素绘制到地图。
import type VectorSource from 'ol/source/Vector.js' // OpenLayers 矢量数据源类型，提供事件要素与空间索引。
import type { EventFeature } from '../sources/create-event-source'
import { getEventStyle } from '../styles/event-style'
import type { EventFeatureProperties } from '../types/event-feature'

export function createEventLayer(source: VectorSource<EventFeature>) {
  // VectorLayer 负责把 source 中的 Point Feature 交给 Canvas 渲染器绘制。
  return new VectorLayer<VectorSource<EventFeature>>({
    // properties 是附加到 Layer 的自定义属性；source 指定被观察和渲染的数据源。
    properties: { layerId: 'event' },
    source,
    // style 回调在要素渲染时执行，feature 是当前待绘制的 OpenLayers Feature。
    style: (feature) => {
      // get(key) 读取 Feature 自定义属性；缺失状态回退为待处理样式。
      const status = feature.get('status') as EventFeatureProperties['status'] | undefined
      return getEventStyle(status ?? 'PENDING')
    },
    // zIndex 控制 Layer 之间的绘制顺序，数值越大越靠上。
    zIndex: 10,
  })
}
