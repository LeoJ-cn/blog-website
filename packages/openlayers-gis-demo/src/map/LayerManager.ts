import type OlMap from 'ol/Map.js' // OpenLayers 地图实例类型，负责统一挂载和移除图层。
import type BaseLayer from 'ol/layer/Base.js' // OpenLayers 所有图层实现共享的基础类型。

export type CoreLayerId =
  | 'base' // 天地图矢量底图与中文注记组成的在线瓦片图层组。
  | 'event' // 普通事件点图层。
  | 'cluster' // 事件聚合图层，与普通事件图层互斥显示。
  | 'heatmap' // 复用事件 Source 的风险热力分析图层，默认关闭。
  | 'responsibilityGrid' // 静态责任网格边界，不参与用户区域筛选。
  | 'region' // 用户绘制和修改的空间范围图层。
  | 'track' // 完整巡检轨迹和人员当前位置图层。
  | 'selection' // 当前选中事件的独立高亮图层，不修改原始事件 Feature。
  | 'eventDraft' // 新建或编辑事件时的临时选点标记，保存或取消后清空。
  | 'analysisInput' // 当前空间分析输入几何，不包含业务事件 Feature。
  | 'analysisResult' // 当前空间分析的缓冲区、区域或测量结果几何。
  | 'analysisHighlight' // 当前分析命中的可见事件副本，最多保存 2,000 个点。

/**
 * 管理 OpenLayers Layer 的所有权和地图挂载关系。
 * 业务模块只使用稳定的 Layer ID，避免在多个 Vue 组件中持有和操作 Layer 实例。
 */
export class LayerManager {
  private readonly layers = new Map<CoreLayerId, BaseLayer>()

  constructor(private readonly map: OlMap) {}

  /** 注册并挂载图层；重复 ID 会抛错，防止同一业务图层被静默覆盖而无法释放。 */
  addLayer(layerId: CoreLayerId, layer: BaseLayer): void {
    if (this.layers.has(layerId)) throw new Error(`Layer 已存在：${layerId}`)
    // BaseLayer.set(key, value) 写入可观察属性；Map.addLayer 按当前 zIndex 将图层加入渲染集合。
    layer.set('layerId', layerId)
    this.layers.set(layerId, layer)
    this.map.addLayer(layer)
  }

  /** 从地图移除图层并释放注册关系；返回值表示目标是否原本存在。 */
  removeLayer(layerId: CoreLayerId): boolean {
    const layer = this.layers.get(layerId)
    if (!layer) return false
    // removeLayer 解除 Map 对 Layer 的持有，但不会自动销毁 Layer 内部 Source。
    this.map.removeLayer(layer)
    this.layers.delete(layerId)
    return true
  }

  /** 获取 Layer 只用于 MapManager 内部编排或诊断，不应写入 Pinia。 */
  getLayer(layerId: CoreLayerId): BaseLayer | undefined {
    return this.layers.get(layerId)
  }

  /** 修改可见性但保留 Source 数据和 Layer 注册关系。 */
  showLayer(layerId: CoreLayerId): void {
    // setVisible(true) 恢复渲染，Layer 与 Source 实例及缓存保持不变。
    this.layers.get(layerId)?.setVisible(true)
  }

  /** 隐藏图层但不移除，便于渲染模式无损切换。 */
  hideLayer(layerId: CoreLayerId): void {
    // setVisible(false) 仅跳过渲染，不会从 Map 移除图层或清空 Source。
    this.layers.get(layerId)?.setVisible(false)
  }

  /** 按注册关系逐一从地图移除全部图层，确保 Map 不再持有业务 Source。 */
  destroy(): void {
    // Map.removeLayer(layer) 逐个解除地图持有关系，参数是此前注册的 BaseLayer 实例。
    for (const layer of this.layers.values()) this.map.removeLayer(layer)
    this.layers.clear()
  }
}
