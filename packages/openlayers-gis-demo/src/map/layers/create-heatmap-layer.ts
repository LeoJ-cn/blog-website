import HeatmapLayer from 'ol/layer/Heatmap.js' // OpenLayers 热力图图层，按事件权重生成密度渲染结果。
import type VectorSource from 'ol/source/Vector.js' // OpenLayers 矢量数据源类型，供热力图复用事件要素。
import type { EventFeature } from '../sources/create-event-source'
import type { EventFeatureProperties } from '../types/event-feature'

const LEVEL_WEIGHT: Record<EventFeatureProperties['level'], number> = {
  HIGH: 1,
  MEDIUM: 0.68,
  LOW: 0.38,
}

/** 复用事件 Source 创建分析图层，权重同时体现调度等级和未闭环风险。 */
/** 复用事件 Source 创建默认隐藏的风险热力层，权重范围为 0～1。 */
export function createHeatmapLayer(source: VectorSource<EventFeature>) {
  // HeatmapLayer 将 source 中的点要素按 weight 合成为像素密度图。
  return new HeatmapLayer({
    // properties 保存稳定 Layer ID；source 复用事件数据，不复制 Feature。
    properties: { layerId: 'heatmap' },
    source,
    // blur 与 radius 的单位均为屏幕像素：blur 控制模糊扩散，radius 控制每个点的影响半径。
    blur: 24,
    radius: 16,
    // weight 回调应返回 0～1；值越大，对热力强度贡献越高。
    weight: (feature) => {
      // get(key) 读取 Feature 上由事件 Source 写入的等级和状态属性。
      const level = feature.get('level') as EventFeatureProperties['level'] | undefined
      const status = feature.get('status') as EventFeatureProperties['status'] | undefined
      if (status === 'DONE') return 0.12
      return LEVEL_WEIGHT[level ?? 'LOW']
    },
    // visible=false 表示注册后默认不渲染；zIndex=8 使热力图位于事件点图层下方。
    visible: false,
    zIndex: 8,
  })
}
