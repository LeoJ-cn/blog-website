import VectorLayer from 'ol/layer/Vector.js'
import ClusterSource from 'ol/source/Cluster.js'
import type VectorSource from 'ol/source/Vector.js'
import type { EventFeature } from '../sources/create-event-source'
import { getClusterStyle } from '../styles/cluster-style'
import { getEventStyle } from '../styles/event-style'
import type { EventFeatureProperties } from '../types/event-feature'

export function createClusterLayer(eventSource: VectorSource<EventFeature>) {
  // ClusterSource 只包装业务 Source，两种渲染模式共享同一批 Feature，避免维护重复数据。
  // distance 与 minDistance 的单位均为屏幕像素：前者控制聚合半径，后者避免聚合图标完全重叠。
  const source = new ClusterSource({ distance: 42, minDistance: 18, source: eventSource })
  const layer = new VectorLayer({
    properties: { layerId: 'cluster' },
    source,
    style: (feature) => {
      const eventFeatures = feature.get('features') as EventFeature[] | undefined
      const singleEvent = eventFeatures?.length === 1 ? eventFeatures[0] : undefined
      if (singleEvent) {
        // 单成员聚合仍代表唯一业务事件，继续展示其处置状态颜色。
        const status = singleEvent.get('status') as EventFeatureProperties['status'] | undefined
        return getEventStyle(status ?? 'PENDING')
      }
      return getClusterStyle(eventFeatures?.length ?? 1)
    },
    visible: false,
    zIndex: 10,
  })
  return { layer, source }
}
