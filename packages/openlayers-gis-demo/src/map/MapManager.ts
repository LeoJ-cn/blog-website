import OlMap from 'ol/Map.js'
import Overlay from 'ol/Overlay.js'
import View from 'ol/View.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import type { EventsKey } from 'ol/events.js'
import type BaseLayer from 'ol/layer/Base.js'
import { unByKey } from 'ol/Observable.js'
import { fromLonLat } from 'ol/proj.js'
import type { InspectionEvent } from '../types/inspection-event'
import type { TrackPlaybackStatus, TrackPoint } from '../types/track'
import { TrackPlaybackController } from '../services/TrackPlaybackController'
import { createBaseLayer } from './layers/create-base-layer'
import { createClusterLayer } from './layers/create-cluster-layer'
import { createEventLayer } from './layers/create-event-layer'
import { createRegionLayer } from './layers/create-region-layer'
import { createSelectionLayer } from './layers/create-selection-layer'
import { createTrackLayer } from './layers/create-track-layer'
import { LayerManager } from './LayerManager'
import type { CoreLayerId } from './LayerManager'
import { SpatialInteractionManager } from './interactions/SpatialInteractionManager'
import type { DrawGeometryType, MapMode } from './interactions/SpatialInteractionManager'
import { createEventFeature, createEventSource } from './sources/create-event-source'

export type RenderMode =
  | 'point' // 逐个渲染原始事件 Feature，适合小数据量和精确选择。
  | 'cluster' // 按当前分辨率聚合相邻事件，适合海量点位浏览。
export interface MapStats {
  /** OpenLayers View 的当前缩放级别，保留一位小数。 */
  zoom: number
  /** 当前渲染模式下 Source 实际持有的 Feature 数量。 */
  featureCount: number
  /** 决定 featureCount 应解释为原始点数量还是聚合结果数量。 */
  renderMode: RenderMode
}
export interface MapManagerOptions {
  /** 初始中心点，按 [WGS84 经度, WGS84 纬度] 排列。 */
  center?: readonly [number, number]
  /** 初始缩放级别；默认 12。 */
  zoom?: number
  /** 首次创建 Source 时写入的业务事件集合。 */
  events?: readonly InspectionEvent[]
  /** Select 结果，仅向 Vue 层传递业务 ID，不泄漏 Feature 实例。 */
  onEventSelect?: (eventId: string | null) => void
  /** 地图移动或渲染完成后的性能指标回调。 */
  onStatsChange?: (stats: MapStats) => void
  /** Draw 或 Modify 完成后返回区域内事件 ID；null 表示没有有效区域筛选。 */
  onRegionSelect?: (eventIds: string[] | null) => void
  /** 按 timestamp 升序排列的轨迹点；时间单位为 Unix 毫秒。 */
  trackPoints?: readonly TrackPoint[]
  /** 动画帧推进或播放状态改变时返回当前巡检时间。 */
  onTrackTimeChange?: (timestamp: number, status: TrackPlaybackStatus) => void
}

const DEFAULT_CENTER: readonly [number, number] = [121.4737, 31.2304]
/** 从业务列表定位单个事件时使用的街区级缩放，不会覆盖用户已经更近的视角。 */
const EVENT_FOCUS_ZOOM = 17.5

export class MapManager {
  private readonly map: OlMap
  private readonly layerManager: LayerManager
  private readonly eventSource: ReturnType<typeof createEventSource>
  private readonly eventLayer: ReturnType<typeof createEventLayer>
  private readonly clusterLayer: ReturnType<typeof createClusterLayer>['layer']
  private readonly clusterSource: ReturnType<typeof createClusterLayer>['source']
  private readonly selectionFeature: ReturnType<typeof createSelectionLayer>['selectedFeature']
  private readonly interactionManager: SpatialInteractionManager
  private readonly trackPlayback: TrackPlaybackController
  private readonly listenerKeys: EventsKey[]
  /** offset 按 [水平像素, 垂直像素] 排列，负值让 Popup 位于点位图标上方。 */
  private readonly popupOverlay = new Overlay({ positioning: 'bottom-center', offset: [0, -14] })
  private renderMode: RenderMode = 'point'
  private mapMode: MapMode = 'select'
  private mounted = false
  private destroyed = false

  constructor(options: MapManagerOptions = {}) {
    const baseLayer = createBaseLayer()
    this.eventSource = createEventSource(options.events)
    this.eventLayer = createEventLayer(this.eventSource)
    // 普通点位与聚合图层共享事件 Source，切换模式不会重复创建十万条 Feature。
    const cluster = createClusterLayer(this.eventSource)
    const region = createRegionLayer()
    const track = createTrackLayer(options.trackPoints ?? [])
    const selection = createSelectionLayer()
    this.clusterLayer = cluster.layer
    this.clusterSource = cluster.source
    this.selectionFeature = selection.selectedFeature
    this.map = new OlMap({
      controls: defaultControls({ rotate: false }),
      view: new View({
        center: fromLonLat([...(options.center ?? DEFAULT_CENTER)]),
        zoom: options.zoom ?? 12,
        minZoom: 3,
        maxZoom: 20,
      }),
    })
    this.layerManager = new LayerManager(this.map)
    this.layerManager.addLayer('base', baseLayer)
    this.layerManager.addLayer('event', this.eventLayer)
    this.layerManager.addLayer('cluster', this.clusterLayer)
    this.layerManager.addLayer('region', region.layer)
    this.layerManager.addLayer('track', track.layer)
    this.layerManager.addLayer('selection', selection.layer)
    this.map.addOverlay(this.popupOverlay)
    this.interactionManager = new SpatialInteractionManager({
      map: this.map,
      eventLayer: this.eventLayer,
      clusterLayer: this.clusterLayer,
      eventSource: this.eventSource,
      regionSource: region.source,
      onEventSelect: (eventId) => {
        const feature = eventId ? this.eventSource.getFeatureById(eventId) : null
        this.updateSelection(feature)
        this.popupOverlay.setPosition(feature?.getGeometry()?.getCoordinates())
        options.onEventSelect?.(eventId)
      },
      onRegionSelect: options.onRegionSelect,
    })
    this.trackPlayback = new TrackPlaybackController({
      personFeature: track.personFeature,
      points: track.projectedPoints,
      onTimeChange: options.onTrackTimeChange,
    })
    const emitStats = () => options.onStatsChange?.(this.getStats())
    this.listenerKeys = [
      this.map.on('moveend', emitStats),
      this.map.on('rendercomplete', emitStats),
    ]
  }

  /** 将已创建的唯一 Map 实例绑定到 DOM；Popup 元素不存在时地图仍可独立工作。 */
  mount(target: HTMLElement, popupElement?: HTMLElement): void {
    this.map.setTarget(target)
    this.popupOverlay.setElement(popupElement)
    this.mounted = true
    this.map.updateSize()
  }

  /** 定位并高亮业务事件；Cluster 模式会切换为普通点位以保证目标可见。 */
  focusEvent(eventId: string): void {
    const feature = this.eventSource.getFeatureById(eventId)
    const coordinates = feature?.getGeometry()?.getCoordinates()
    if (!feature || !coordinates) return
    if (this.renderMode !== 'point') this.setRenderMode('point')
    this.updateSelection(feature)
    this.popupOverlay.setPosition(coordinates)
    const view = this.map.getView()
    view.animate({
      center: coordinates,
      // 列表定位需要让点位清晰可见，但用户已手动放得更近时不应突然缩小。
      zoom: Math.max(view.getZoom() ?? EVENT_FOCUS_ZOOM, EVENT_FOCUS_ZOOM),
      duration: 450,
    })
  }

  /** 批量替换事件数据；调用后原有 Feature 引用全部失效。 */
  setEvents(events: readonly InspectionEvent[]): void {
    // 先完成对象转换再批量替换，避免逐条 addFeature 触发大量增量渲染。
    const features = events.map(createEventFeature)
    // Source 清空前解除旧选中 Feature 和 Popup 引用，避免大批数据切换后保留失效对象。
    this.updateSelection(null)
    this.popupOverlay.setPosition(undefined)
    this.eventSource.clear(true)
    this.eventSource.addFeatures(features)
  }

  /** 切换互斥渲染图层；独立 SelectionLayer 会跨渲染模式保留当前选中态。 */
  setRenderMode(mode: RenderMode): void {
    // 两套业务图层互斥显示，但底层事件 Source 始终保持同一份数据。
    this.renderMode = mode
    this.eventLayer.setVisible(mode === 'point')
    this.clusterLayer.setVisible(mode === 'cluster')
    // Select 同时支持普通点和聚合点，仅由当前交互模式决定是否启用。
    this.interactionManager.setSelectActive(this.mapMode === 'select')
    this.map.render()
  }

  /** 激活一种空间交互；Draw 模式下 drawType 决定新建几何类型。 */
  setInteractionMode(mode: MapMode, drawType: DrawGeometryType = 'Polygon'): void {
    this.mapMode = mode
    this.interactionManager.setMode(mode, drawType)
    this.interactionManager.setSelectActive(mode === 'select')
  }

  /** 返回当前 View 与可见业务 Source 的快照，不包含不可见图层数量。 */
  getStats(): MapStats {
    return {
      zoom: Number((this.map.getView().getZoom() ?? 0).toFixed(1)),
      featureCount:
        this.renderMode === 'cluster'
          ? this.clusterSource.getFeatures().length
          : this.eventSource.getFeatures().length,
      renderMode: this.renderMode,
    }
  }

  /** 从当前位置开始或继续轨迹播放。 */
  playTrack(): void {
    this.trackPlayback.play()
  }

  /** 暂停轨迹并保留当前人员位置。 */
  pauseTrack(): void {
    this.trackPlayback.pause()
  }

  /** 将轨迹时间和人员 Feature 恢复到起点。 */
  resetTrack(): void {
    this.trackPlayback.reset()
  }

  /** 设置轨迹时间倍率，仅支持演示面板暴露的 1x 或 2x。 */
  setTrackSpeed(speed: 1 | 2): void {
    this.trackPlayback.setSpeed(speed)
  }

  /** 返回内部 Layer 供诊断和高级编排使用，调用方不得把实例写入 Pinia。 */
  getLayer(layerId: CoreLayerId): BaseLayer | undefined {
    return this.layerManager.getLayer(layerId)
  }
  /** 显示指定核心图层；普通点位与 Cluster 的业务互斥仍应通过 setRenderMode 控制。 */
  showLayer(layerId: CoreLayerId): void {
    this.layerManager.showLayer(layerId)
  }
  /** 隐藏指定核心图层，不会清空对应 Source。 */
  hideLayer(layerId: CoreLayerId): void {
    this.layerManager.hideLayer(layerId)
  }

  /** 注册并挂载扩展核心图层；重复 ID 会由 LayerManager 拒绝。 */
  addLayer(layerId: CoreLayerId, layer: BaseLayer): void {
    this.layerManager.addLayer(layerId, layer)
  }

  /** 移除指定图层；返回值表示该 ID 是否存在。 */
  removeLayer(layerId: CoreLayerId): boolean {
    return this.layerManager.removeLayer(layerId)
  }

  private updateSelection(feature: ReturnType<typeof createEventFeature> | null): void {
    // 克隆 Point 可避免高亮层和事件层共享可变 Geometry，后续扩展动画时互不影响。
    this.selectionFeature.setGeometry(feature?.getGeometry()?.clone())
  }

  /** 幂等释放监听器、Interaction、Overlay 和海量 Feature；未挂载实例也必须释放。 */
  destroy(): void {
    if (this.destroyed) return
    if (this.mounted) this.map.setTarget(undefined)
    unByKey(this.listenerKeys)
    this.interactionManager.destroy()
    this.trackPlayback.destroy()
    this.popupOverlay.setElement(undefined)
    this.map.removeOverlay(this.popupOverlay)
    this.updateSelection(null)
    this.eventSource.clear(true)
    // 主动解除 ClusterSource 对事件 Source 的引用，便于大数据集合及时回收。
    this.clusterSource.setSource(null)
    this.layerManager.destroy()
    this.mounted = false
    this.destroyed = true
  }
}
