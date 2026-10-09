import OlMap from 'ol/Map.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import Overlay from 'ol/Overlay.js'
import View from 'ol/View.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import type { EventsKey } from 'ol/events.js'
import { createEmpty, extendCoordinate, isEmpty } from 'ol/extent.js'
import type BaseLayer from 'ol/layer/Base.js'
import { unByKey } from 'ol/Observable.js'
import { fromLonLat, toLonLat } from 'ol/proj.js'
import type { InspectionEvent } from '../types/inspection-event'
import type { TrackPlaybackSpeed, TrackPlaybackStatus, TrackPoint } from '../types/track'
import { TrackPlaybackController } from '../services/TrackPlaybackController'
import { createBaseLayer } from './layers/create-base-layer'
import { createClusterLayer } from './layers/create-cluster-layer'
import { createEventLayer } from './layers/create-event-layer'
import { createEventDraftLayer } from './layers/create-event-draft-layer'
import { createRegionLayer } from './layers/create-region-layer'
import { createSelectionLayer } from './layers/create-selection-layer'
import { createTrackLayer } from './layers/create-track-layer'
import { deserializeRegionGeometry, serializeRegionGeometry } from './region-geometry'
import { LayerManager } from './LayerManager'
import type { CoreLayerId } from './LayerManager'
import type { RegionGeometry } from '../types/region'
import { SpatialInteractionManager } from './interactions/SpatialInteractionManager'
import type { DrawGeometryType, MapMode } from './interactions/SpatialInteractionManager'
import {
  createEventFeature,
  createEventSource,
  type EventFeature,
  updateEventFeature,
} from './sources/create-event-source'

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
  /** 最近一次批量业务数据转换为 OpenLayers Feature 的主线程耗时，单位为毫秒。 */
  featureConversionMs: number
  /** 最近一次 VectorSource 清空并批量写入 Feature 的耗时，单位为毫秒。 */
  sourceUpdateMs: number
  /** 从最近一次批量替换开始到地图 rendercomplete 的耗时；null 表示仍在等待完成。 */
  renderCompleteMs: number | null
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
/** 多结果定位时的最大缩放级别，避免相邻点位被放大到建筑细节层级。 */
const EVENT_RESULTS_MAX_ZOOM = 17
/** View.fit 的 padding 按 [上, 右, 下, 左] 排列，单位为 CSS 像素。 */
const EVENT_RESULTS_PADDING: [number, number, number, number] = [64, 64, 64, 64]

export class MapManager {
  private readonly map: OlMap
  private readonly layerManager: LayerManager
  private readonly eventSource: ReturnType<typeof createEventSource>
  private readonly eventLayer: ReturnType<typeof createEventLayer>
  private readonly clusterLayer: ReturnType<typeof createClusterLayer>['layer']
  private readonly clusterSource: ReturnType<typeof createClusterLayer>['source']
  private readonly regionSource: ReturnType<typeof createRegionLayer>['source']
  private readonly selectionFeature: ReturnType<typeof createSelectionLayer>['selectedFeature']
  private readonly eventDraftFeature: ReturnType<typeof createEventDraftLayer>['draftFeature']
  private readonly startEventDraftPulse: ReturnType<typeof createEventDraftLayer>['startPulse']
  private readonly stopEventDraftPulse: ReturnType<typeof createEventDraftLayer>['stopPulse']
  private readonly interactionManager: SpatialInteractionManager
  private readonly trackPlayback: TrackPlaybackController
  private readonly listenerKeys: EventsKey[]
  /** offset 按 [水平像素, 垂直像素] 排列，负值让 Popup 位于点位图标上方。 */
  private readonly popupOverlay = new Overlay({ positioning: 'bottom-center', offset: [0, -14] })
  private renderMode: RenderMode = 'point'
  private mapMode: MapMode = 'select'
  private drawType: DrawGeometryType = 'Polygon'
  private eventLayersVisible = true
  private eventLocationPickKey: EventsKey | null = null
  private featureConversionMs = 0
  private sourceUpdateMs = 0
  private renderCompleteMs: number | null = null
  /** performance.now() 时间戳，单位为毫秒；仅在等待本次批量更新完成渲染时存在。 */
  private pendingRenderStartedAt: number | null = null
  private mounted = false
  private destroyed = false

  constructor(options: MapManagerOptions = {}) {
    const baseLayer = createBaseLayer()
    const conversionStartedAt = performance.now()
    const initialFeatures = (options.events ?? []).map(createEventFeature)
    this.featureConversionMs = performance.now() - conversionStartedAt
    const sourceUpdateStartedAt = performance.now()
    this.eventSource = createEventSource()
    this.eventSource.addFeatures(initialFeatures)
    this.sourceUpdateMs = performance.now() - sourceUpdateStartedAt
    this.eventLayer = createEventLayer(this.eventSource)
    // 普通点位与聚合图层共享事件 Source，切换模式不会重复创建十万条 Feature。
    const cluster = createClusterLayer(this.eventSource)
    const region = createRegionLayer()
    const track = createTrackLayer(options.trackPoints ?? [])
    const selection = createSelectionLayer()
    const eventDraft = createEventDraftLayer()
    this.clusterLayer = cluster.layer
    this.clusterSource = cluster.source
    this.regionSource = region.source
    this.selectionFeature = selection.selectedFeature
    this.eventDraftFeature = eventDraft.draftFeature
    this.startEventDraftPulse = eventDraft.startPulse
    this.stopEventDraftPulse = eventDraft.stopPulse
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
    this.layerManager.addLayer('eventDraft', eventDraft.layer)
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
    const emitRenderStats = () => {
      if (this.pendingRenderStartedAt !== null) {
        this.renderCompleteMs = performance.now() - this.pendingRenderStartedAt
        this.pendingRenderStartedAt = null
      }
      emitStats()
    }
    this.listenerKeys = [
      this.map.on('moveend', emitStats),
      this.map.on('rendercomplete', emitRenderStats),
    ]
  }

  /** 将已创建的唯一 Map 实例绑定到 DOM；Popup 元素不存在时地图仍可独立工作。 */
  mount(target: HTMLElement, popupElement?: HTMLElement): void {
    // 首屏渲染只能从绑定真实 DOM 后开始计时，避免把构造阶段的页面等待算入地图耗时。
    this.renderCompleteMs = null
    this.pendingRenderStartedAt = performance.now()
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

  /**
   * 将地图视角调整到指定事件的完整范围；省略 eventIds 时定位当前 Source 的全部事件。
   * 返回 false 表示没有找到可定位的有效点位，调用方可保持当前视角不变。
   */
  fitEvents(eventIds?: readonly string[]): boolean {
    const extent = createEmpty()
    let firstCoordinate: number[] | null = null
    let coordinateCount = 0
    const includeFeature = (feature: EventFeature | null): void => {
      const coordinate = feature?.getGeometry()?.getCoordinates()
      if (!coordinate) return
      firstCoordinate ??= coordinate
      coordinateCount += 1
      extendCoordinate(extent, coordinate)
    }
    if (eventIds) {
      for (const eventId of eventIds) includeFeature(this.eventSource.getFeatureById(eventId))
    } else {
      // 直接遍历 Source，避免定位十万点时额外创建 Feature 与坐标数组。
      this.eventSource.forEachFeature(includeFeature)
    }
    if (coordinateCount === 0 || !firstCoordinate) return false

    const view = this.map.getView()
    if (coordinateCount === 1) {
      view.animate({
        center: firstCoordinate,
        zoom: Math.max(view.getZoom() ?? EVENT_FOCUS_ZOOM, EVENT_FOCUS_ZOOM),
        duration: 450,
      })
      return true
    }

    if (isEmpty(extent)) return false
    view.fit(extent, {
      duration: 450,
      maxZoom: EVENT_RESULTS_MAX_ZOOM,
      padding: EVENT_RESULTS_PADDING,
    })
    return true
  }

  /** 批量替换事件数据；调用后原有 Feature 引用全部失效。 */
  setEvents(events: readonly InspectionEvent[]): void {
    const batchStartedAt = performance.now()
    // 先完成对象转换再批量替换，避免逐条 addFeature 触发大量增量渲染。
    const conversionStartedAt = performance.now()
    const features = events.map(createEventFeature)
    this.featureConversionMs = performance.now() - conversionStartedAt
    // Source 清空前解除旧选中 Feature 和 Popup 引用，避免大批数据切换后保留失效对象。
    this.updateSelection(null)
    this.popupOverlay.setPosition(undefined)
    const sourceUpdateStartedAt = performance.now()
    this.eventSource.clear(true)
    this.eventSource.addFeatures(features)
    this.sourceUpdateMs = performance.now() - sourceUpdateStartedAt
    // rendercomplete 是异步信号，因此先保留批次起点，完成前向面板暴露 null。
    this.renderCompleteMs = null
    this.pendingRenderStartedAt = batchStartedAt
  }

  /** 向当前可见 Source 增量加入事件；ID 已存在时返回 false，避免覆盖既有 Feature。 */
  addEvent(event: InspectionEvent): boolean {
    if (this.eventSource.getFeatureById(event.id)) return false
    this.eventSource.addFeature(createEventFeature(event))
    return true
  }

  /** 更新单个可见事件并保留原 Feature 身份；返回 false 表示当前筛选 Source 中不存在该事件。 */
  updateEvent(event: InspectionEvent): boolean {
    const feature = this.eventSource.getFeatureById(event.id)
    if (!feature) return false
    updateEventFeature(feature, event)
    return true
  }

  /** 删除当前可见 Source 中的事件，并清除可能指向该事件的高亮和 Popup。 */
  removeEvent(eventId: string): boolean {
    const feature = this.eventSource.getFeatureById(eventId)
    if (!feature) return false
    this.eventSource.removeFeature(feature)
    this.updateSelection(null)
    this.popupOverlay.setPosition(undefined)
    return true
  }

  /** 切换互斥渲染图层；独立 SelectionLayer 会跨渲染模式保留当前选中态。 */
  setRenderMode(mode: RenderMode): void {
    // 两套业务图层互斥显示，但底层事件 Source 始终保持同一份数据。
    this.renderMode = mode
    this.eventLayer.setVisible(this.eventLayersVisible && mode === 'point')
    this.clusterLayer.setVisible(this.eventLayersVisible && mode === 'cluster')
    // Select 同时支持普通点和聚合点，仅由当前交互模式决定是否启用。
    this.interactionManager.setSelectActive(this.mapMode === 'select')
    this.map.render()
  }

  /** 统一控制普通点和 Cluster 显隐，并继续保持当前渲染模式的互斥关系。 */
  setEventLayersVisible(visible: boolean): void {
    this.eventLayersVisible = visible
    this.eventLayer.setVisible(visible && this.renderMode === 'point')
    this.clusterLayer.setVisible(visible && this.renderMode === 'cluster')
    this.map.render()
  }

  /** 激活一种空间交互；Draw 模式下 drawType 决定新建几何类型。 */
  setInteractionMode(mode: MapMode, drawType: DrawGeometryType = 'Polygon'): void {
    this.cancelEventLocationPick(false)
    this.mapMode = mode
    this.drawType = drawType
    this.interactionManager.setMode(mode, drawType)
    this.interactionManager.setSelectActive(mode === 'select')
  }

  /**
   * 独占下一次地图单击并返回 [WGS84 经度, WGS84 纬度]；完成后恢复此前空间交互。
   */
  startEventLocationPick(onPick: (coordinate: readonly [number, number]) => void): void {
    this.cancelEventLocationPick()
    this.interactionManager.setAllInactive()
    const targetElement = this.map.getTargetElement()
    if (targetElement) targetElement.style.cursor = 'crosshair'
    this.eventLocationPickKey = this.map.once('singleclick', (event) => {
      const [lng, lat] = toLonLat(event.coordinate)
      this.setEventDraftLocation([lng, lat])
      this.eventLocationPickKey = null
      this.restoreInteractionAfterLocationPick()
      onPick([lng, lat])
    })
  }

  /** 更新临时事件标记；坐标按 [WGS84 经度, WGS84 纬度] 排列，null 表示清除。 */
  setEventDraftLocation(coordinate: readonly [number, number] | null): void {
    this.eventDraftFeature.setGeometry(
      coordinate ? new Point(fromLonLat([...coordinate])) : undefined,
    )
    if (coordinate) this.startEventDraftPulse()
    else this.stopEventDraftPulse()
  }

  /** 取消尚未完成的地图选点；默认恢复进入选点前的空间交互模式。 */
  cancelEventLocationPick(restoreInteraction = true): void {
    const wasPicking = this.eventLocationPickKey !== null
    if (this.eventLocationPickKey) {
      unByKey(this.eventLocationPickKey)
      this.eventLocationPickKey = null
    }
    const targetElement = this.map.getTargetElement()
    if (targetElement) targetElement.style.cursor = ''
    // 没有待取消监听时不重复重建 Draw，避免普通表单关闭影响正在进行的空间绘制。
    if (restoreInteraction && wasPicking) this.restoreInteractionAfterLocationPick()
  }

  /** 返回当前 Polygon/Circle 的可序列化 WGS84 协议；Point 或空区域返回 null。 */
  getCurrentRegionGeometry(): RegionGeometry | null {
    const geometry = this.regionSource.getFeatures()[0]?.getGeometry()
    return geometry ? serializeRegionGeometry(geometry) : null
  }

  /** 载入、定位并重新计算一个已保存区域；传入数据不会保存 OpenLayers 实例。 */
  showRegion(regionGeometry: RegionGeometry): void {
    const geometry = deserializeRegionGeometry(regionGeometry)
    this.regionSource.clear()
    this.regionSource.addFeature(new Feature({ geometry }))
    this.interactionManager.evaluateRegion(geometry)
    this.map.getView().fit(geometry.getExtent(), {
      duration: 450,
      maxZoom: 17,
      padding: [56, 56, 56, 56],
    })
  }

  /** 清除当前绘制区域；业务层负责同步清除对应筛选结果。 */
  clearRegion(): void {
    this.regionSource.clear()
  }

  /** 在事件 Source 替换后重新计算当前区域；返回 false 表示当前没有有效区域。 */
  reevaluateCurrentRegion(): boolean {
    const geometry = this.regionSource.getFeatures()[0]?.getGeometry()
    if (!geometry || !serializeRegionGeometry(geometry)) return false
    this.interactionManager.evaluateRegion(geometry)
    return true
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
      featureConversionMs: this.featureConversionMs,
      sourceUpdateMs: this.sourceUpdateMs,
      renderCompleteMs: this.renderCompleteMs,
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

  /** 设置轨迹时间倍率，仅支持演示面板暴露的 1x、2x 或 8x。 */
  setTrackSpeed(speed: TrackPlaybackSpeed): void {
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

  private restoreInteractionAfterLocationPick(): void {
    const targetElement = this.map.getTargetElement()
    if (targetElement) targetElement.style.cursor = ''
    this.interactionManager.setMode(this.mapMode, this.drawType)
    this.interactionManager.setSelectActive(this.mapMode === 'select')
  }

  /** 幂等释放监听器、Interaction、Overlay 和海量 Feature；未挂载实例也必须释放。 */
  destroy(): void {
    if (this.destroyed) return
    this.cancelEventLocationPick(false)
    if (this.mounted) this.map.setTarget(undefined)
    unByKey(this.listenerKeys)
    this.interactionManager.destroy()
    this.trackPlayback.destroy()
    this.popupOverlay.setElement(undefined)
    this.map.removeOverlay(this.popupOverlay)
    this.updateSelection(null)
    this.setEventDraftLocation(null)
    this.eventSource.clear(true)
    // 主动解除 ClusterSource 对事件 Source 的引用，便于大数据集合及时回收。
    this.clusterSource.setSource(null)
    this.layerManager.destroy()
    this.mounted = false
    this.destroyed = true
  }
}
