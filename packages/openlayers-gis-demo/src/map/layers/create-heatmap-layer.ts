import HeatmapLayer from 'ol/layer/Heatmap.js'
import type VectorSource from 'ol/source/Vector.js'
import type { EventFeature } from '../sources/create-event-source'
import type { EventFeatureProperties } from '../types/event-feature'

const LEVEL_WEIGHT: Record<EventFeatureProperties['level'], number> = {
  HIGH: 1,
  MEDIUM: 0.68,
  LOW: 0.38,
}

/** 复用事件 Source 创建分析图层，权重同时体现调度等级和未闭环风险。 */
export function createHeatmapLayer(source: VectorSource<EventFeature>) {
  return new HeatmapLayer({
    properties: { layerId: 'heatmap' },
    source,
    blur: 24,
    radius: 16,
    weight: (feature) => {
      const level = feature.get('level') as EventFeatureProperties['level'] | undefined
      const status = feature.get('status') as EventFeatureProperties['status'] | undefined
      if (status === 'DONE') return 0.12
      return LEVEL_WEIGHT[level ?? 'LOW']
    },
    visible: false,
    zIndex: 8,
  })
}
