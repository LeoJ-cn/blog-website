import VectorLayer from 'ol/layer/Vector.js' // OpenLayers 矢量图层，绘制聚合数据源产生的聚合要素。
import ClusterSource from 'ol/source/Cluster.js' // OpenLayers 聚合数据源，按屏幕像素距离合并邻近事件。
import type VectorSource from 'ol/source/Vector.js' // OpenLayers 原始矢量数据源类型，为聚合提供事件要素。
import type { EventFeature } from '../sources/create-event-source'
import { getClusterStyle } from '../styles/cluster-style'
import { getEventStyle } from '../styles/event-style'
import type { EventFeatureProperties } from '../types/event-feature'

export function createClusterLayer(eventSource: VectorSource<EventFeature>) {
  // ClusterSource 只包装业务 Source，两种渲染模式共享同一批 Feature，避免维护重复数据。
  // distance 与 minDistance 的单位均为屏幕像素：前者控制聚合半径，后者避免聚合图标完全重叠。
  const source = new ClusterSource({ distance: 42, minDistance: 18, source: eventSource })
  // VectorLayer 渲染 ClusterSource 生成的聚合 Feature，而不是直接渲染原始事件 Feature。
  const layer = new VectorLayer({
    // properties 保存业务图层标识；source 指定聚合数据源。
    properties: { layerId: 'cluster' },
    source,
    // style 回调接收聚合 Feature，其 features 属性由 ClusterSource 自动写入。
    style: (feature) => {
      // get('features') 取得当前聚合包含的原始事件 Feature 数组。
      const eventFeatures = feature.get('features') as EventFeature[] | undefined
      const singleEvent = eventFeatures?.length === 1 ? eventFeatures[0] : undefined
      if (singleEvent) {
        // 单成员聚合仍代表唯一业务事件，继续展示其处置状态颜色。
        const status = singleEvent.get('status') as EventFeatureProperties['status'] | undefined
        return getEventStyle(status ?? 'PENDING')
      }
      return getClusterStyle(eventFeatures?.length ?? 1)
    },
    // visible=false 表示默认使用普通事件层；zIndex=10 与普通事件层保持相同层级。
    visible: false,
    zIndex: 10,
  })
  return { layer, source }
}
