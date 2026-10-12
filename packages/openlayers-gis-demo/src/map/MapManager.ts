import OlMap from 'ol/Map.js' // OpenLayers 地图根对象，编排 View、Layer、Control、Overlay 和 Interaction。
import Feature from 'ol/Feature.js' // OpenLayers 要素容器，用于创建或更新可渲染的业务对象。
import Point from 'ol/geom/Point.js' // OpenLayers 点几何，用投影坐标表示事件和临时位置。
import Overlay from 'ol/Overlay.js' // OpenLayers DOM 覆盖物，将 Popup 锚定到地图坐标。
import View from 'ol/View.js' // OpenLayers 视图状态，管理中心点、分辨率、缩放级别和投影。
import { defaults as defaultControls } from 'ol/control/defaults.js' // 创建 OpenLayers 默认控件集合，供地图按需扩展。
import ScaleLine from 'ol/control/ScaleLine.js' // OpenLayers 比例尺控件，按当前分辨率显示实际距离。
import type { EventsKey } from 'ol/events.js' // OpenLayers 事件订阅句柄类型，用于在销毁时精确解绑。
import { createEmpty, extendCoordinate, isEmpty } from 'ol/extent.js' // 创建、扩展并检查 OpenLayers 坐标范围。
import type BaseLayer from 'ol/layer/Base.js' // OpenLayers 图层基础类型，用于统一处理不同业务图层。
import { unByKey } from 'ol/Observable.js' // 按订阅句柄解除 OpenLayers Observable 事件监听。
import { fromLonLat, toLonLat } from 'ol/proj.js' // 在业务 WGS84 经纬度与地图投影坐标之间双向转换。
import type { InspectionEvent } from '../types/inspection-event'
import type { Wgs84Bbox } from '../viewport/types'
import type { TrackPlaybackSpeed, TrackPlaybackStatus, TrackPoint } from '../types/track'
import { TrackPlaybackController } from '../services/TrackPlaybackController'
import { createBaseLayer } from './layers/create-base-layer'
import { createClusterLayer } from './layers/create-cluster-layer'
import { createEventLayer } from './layers/create-event-layer'
import { createHeatmapLayer } from './layers/create-heatmap-layer'
import { createResponsibilityGridLayer } from './layers/create-responsibility-grid-layer'
import { createEventDraftLayer } from './layers/create-event-draft-layer'
import { createRegionLayer } from './layers/create-region-layer'
import { createSelectionLayer } from './layers/create-selection-layer'
import { createTrackLayer } from './layers/create-track-layer'
import { deserializeRegionGeometry, serializeRegionGeometry } from './region-geometry'
import { LayerManager } from './LayerManager'
import type { CoreLayerId } from './LayerManager'
import type { RegionGeometry, Wgs84Coordinate } from '../types/region'
import { SpatialInteractionManager } from './interactions/SpatialInteractionManager'
import type { DrawGeometryType, MapMode } from './interactions/SpatialInteractionManager'
import {
  createEventFeature,
  createEventSource,
  type EventFeature,
  updateEventFeature,
} from './sources/create-event-source'
import { syncEventSource, type EventSourceDiffStats } from './sources/sync-event-source'
import { calculateWgs84ViewportBbox } from './viewport-bbox'

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
  /** 最近一次按事件 ID 增量同步的计数与耗时；尚未执行 Diff 时为 null。 */
  eventSourceDiff: EventSourceDiffStats | null
}
export interface MapManagerOptions {
  /** 天地图浏览器端 Token；空值时保留业务图层，但不创建在线底图 Source。 */
  tiandituToken?: string
  /** 天地图底图或中文注记瓦片加载失败时通知宿主展示非敏感提示。 */
  onBaseMapError?: () => void
  /** 初始中心点，按 [WGS84 经度, WGS84 纬度] 排列。 */
  center?: readonly [number, number]
  /** 初始缩放级别；默认 12。 */
  zoom?: number
  /** 首次创建 Source 时写入的业务事件集合。 */
  events?: readonly InspectionEvent[]
  /** Select 结果，仅向 Vue 层传递业务 ID，不泄漏 Feature 实例。 */
  onEventSelect?: (eventId: string | null) => void
  /** 地图绑定或 moveend 后返回当前 WGS84 BBOX；四条边均包含。 */
  onViewportChange?: (bbox: Wgs84Bbox) => void
  /** 当前选中事件因视口 Diff 被删除时通知 Vue 清理业务选择。 */
  onEventSelectInvalidated?: (eventId: string) => void
  /** 地图移动或渲染完成后的性能指标回调。 */
  onStatsChange?: (stats: MapStats) => void
  /** 指针所在位置，按 [WGS84 经度, WGS84 纬度] 排列；离开地图时返回 null。 */
  onPointerCoordinate?: (coordinate: Wgs84Coordinate | null) => void
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
/** 达到该缩放级别后强制展示原始点位，保证街区级视角可以选择每个巡检事件。 */
const CLUSTER_BREAK_ZOOM = 16
/** View.fit 的 padding 按 [上, 右, 下, 左] 排列，单位为 CSS 像素。 */
const EVENT_RESULTS_PADDING: [number, number, number, number] = [64, 64, 64, 64]
/** 鼠标坐标通知的最小间隔，单位为毫秒；约 12 Hz 足以读取且避免高频触发 Vue 渲染。 */
const POINTER_COORDINATE_INTERVAL_MS = 80

export class MapManager {
  private readonly map: OlMap
  private readonly layerManager: LayerManager
  private readonly eventSource: ReturnType<typeof createEventSource>
  private readonly eventLayer: ReturnType<typeof createEventLayer>
  private readonly clusterLayer: ReturnType<typeof createClusterLayer>['layer']
  private readonly clusterSource: ReturnType<typeof createClusterLayer>['source']
  private readonly regionSource: ReturnType<typeof createRegionLayer>['source']
  private readonly trackSource: ReturnType<typeof createTrackLayer>['source']
  private readonly selectionFeature: ReturnType<typeof createSelectionLayer>['selectedFeature']
  private readonly eventDraftFeature: ReturnType<typeof createEventDraftLayer>['draftFeature']
  private readonly startEventDraftPulse: ReturnType<typeof createEventDraftLayer>['startPulse']
  private readonly stopEventDraftPulse: ReturnType<typeof createEventDraftLayer>['stopPulse']
  private readonly setResponsibilityGridProgress: ReturnType<
    typeof createResponsibilityGridLayer
  >['setCoverageProgress']
  private readonly setTrackCheckpointProgress: ReturnType<
    typeof createTrackLayer
  >['setCheckpointProgress']
  private readonly interactionManager: SpatialInteractionManager
  private readonly trackPlayback: TrackPlaybackController
  private readonly onViewportChange?: (bbox: Wgs84Bbox) => void
  private readonly onEventSelectInvalidated?: (eventId: string) => void
  private readonly listenerKeys: EventsKey[]
  private readonly handlePointerLeave: () => void
  /** offset 按 [水平像素, 垂直像素] 排列，负值让 Popup 位于点位图标上方。 */
  // Overlay.positioning 指定 DOM 锚点相对坐标的位置；offset 是 [水平, 垂直] CSS 像素偏移。
  private readonly popupOverlay = new Overlay({ positioning: 'bottom-center', offset: [0, -14] })
  private renderMode: RenderMode = 'point'
  private mapMode: MapMode = 'select'
  private drawType: DrawGeometryType = 'Polygon'
  private eventLayersVisible = true
  private eventLocationPickKey: EventsKey | null = null
  private featureConversionMs = 0
  private sourceUpdateMs = 0
  private renderCompleteMs: number | null = null
  private eventSourceDiff: EventSourceDiffStats | null = null
  private selectedEventId: string | null = null
  private lastViewportBbox: Wgs84Bbox | null = null
  /** 最近一次坐标回调的 performance.now() 时间戳，单位为毫秒。 */
  private lastPointerCoordinateEmittedAt = 0
  /** performance.now() 时间戳，单位为毫秒；仅在等待本次批量更新完成渲染时存在。 */
  private pendingRenderStartedAt: number | null = null
  private mounted = false
  private destroyed = false

  constructor(options: MapManagerOptions = {}) {
    this.onViewportChange = options.onViewportChange
    this.onEventSelectInvalidated = options.onEventSelectInvalidated
    const baseLayer = createBaseLayer({
      token: options.tiandituToken ?? '',
      onLoadError: options.onBaseMapError,
    })
    const conversionStartedAt = performance.now()
    const initialFeatures = (options.events ?? []).map(createEventFeature)
    this.featureConversionMs = performance.now() - conversionStartedAt
    const sourceUpdateStartedAt = performance.now()
    this.eventSource = createEventSource()
    // VectorSource.addFeatures 批量加入初始 Feature，并一次性更新空间索引与渲染状态。
    this.eventSource.addFeatures(initialFeatures)
    this.sourceUpdateMs = performance.now() - sourceUpdateStartedAt
    this.eventLayer = createEventLayer(this.eventSource)
    // 普通点位与聚合图层共享事件 Source，切换模式不会重复创建十万条 Feature。
    const cluster = createClusterLayer(this.eventSource)
    const region = createRegionLayer()
    const track = createTrackLayer(options.trackPoints ?? [])
    const responsibilityGrid = createResponsibilityGridLayer()
    const selection = createSelectionLayer()
    const eventDraft = createEventDraftLayer()
    this.clusterLayer = cluster.layer
    this.clusterSource = cluster.source
    this.regionSource = region.source
    this.trackSource = track.source
    this.selectionFeature = selection.selectedFeature
    this.eventDraftFeature = eventDraft.draftFeature
    this.startEventDraftPulse = eventDraft.startPulse
    this.stopEventDraftPulse = eventDraft.stopPulse
    this.setResponsibilityGridProgress = responsibilityGrid.setCoverageProgress
    this.setTrackCheckpointProgress = track.setCheckpointProgress
    // Map.controls 接收控件集合；Map.view 接收唯一 View，target 延迟到 mount 时绑定 DOM。
    this.map = new OlMap({
      // defaultControls({rotate:false}) 创建默认控件并关闭旋转控件；extend 追加自定义比例尺。
      controls: defaultControls({ rotate: false }).extend([
        // 比例尺由 View 分辨率自动换算，使用 metric 输出米或千米。
        new ScaleLine({
          // units=metric 输出米/千米；minWidth、maxWidth 限制比例尺目标宽度，单位为 CSS 像素。
          units: 'metric',
          // OpenLayers 10 默认不限制最大宽度；显式约束避免比例尺在宽地图上占据过多空间。
          minWidth: 64,
          maxWidth: 120,
        }),
      ]),
      // View.center 使用投影坐标；zoom 是初始级别；minZoom/maxZoom 限制用户缩放范围。
      view: new View({
        // fromLonLat 接收 [经度, 纬度]，转换为默认 EPSG:3857 中心坐标。
        center: fromLonLat([...(options.center ?? DEFAULT_CENTER)]),
        zoom: options.zoom ?? 12,
        minZoom: 3,
        maxZoom: 20,
      }),
    })
    this.layerManager = new LayerManager(this.map)
    this.layerManager.addLayer('base', baseLayer)
    this.layerManager.addLayer('responsibilityGrid', responsibilityGrid.layer)
    this.layerManager.addLayer('heatmap', createHeatmapLayer(this.eventSource))
    this.layerManager.addLayer('event', this.eventLayer)
    this.layerManager.addLayer('cluster', this.clusterLayer)
    this.layerManager.addLayer('region', region.layer)
    this.layerManager.addLayer('track', track.layer)
    this.layerManager.addLayer('selection', selection.layer)
    this.layerManager.addLayer('eventDraft', eventDraft.layer)
    // addOverlay 将 DOM 覆盖物加入 Map 管理，但在 setElement 前不会显示实际内容。
    this.map.addOverlay(this.popupOverlay)
    this.interactionManager = new SpatialInteractionManager({
      map: this.map,
      eventLayer: this.eventLayer,
      clusterLayer: this.clusterLayer,
      eventSource: this.eventSource,
      regionSource: region.source,
      onEventSelect: (eventId) => {
        // getFeatureById 使用 setId 建立的索引按业务 ID 查找 Feature，未命中时返回 null。
        const feature = eventId ? this.eventSource.getFeatureById(eventId) : null
        this.selectedEventId = eventId
        this.updateSelection(feature)
        // setPosition 接收 [x, y] 投影坐标；undefined 会隐藏 Overlay。
        this.popupOverlay.setPosition(feature?.getGeometry()?.getCoordinates())
        options.onEventSelect?.(eventId)
      },
      onRegionSelect: options.onRegionSelect,
    })
    this.trackPlayback = new TrackPlaybackController({
      personFeature: track.personFeature,
      completedLineFeature: track.completedLineFeature,
      points: track.projectedPoints,
      onTimeChange: options.onTrackTimeChange,
    })
    const emitStats = () => options.onStatsChange?.(this.getStats())
    const emitViewportChange = () => {
      const bbox = this.getViewportBbox()
      if (!bbox || this.isSameBbox(bbox, this.lastViewportBbox)) return
      this.lastViewportBbox = bbox
      this.onViewportChange?.(bbox)
    }
    this.handlePointerLeave = () => options.onPointerCoordinate?.(null)
    const emitRenderStats = () => {
      if (this.pendingRenderStartedAt !== null) {
        this.renderCompleteMs = performance.now() - this.pendingRenderStartedAt
        this.pendingRenderStartedAt = null
      }
      emitStats()
    }
    this.listenerKeys = [
      // View.on('change:resolution') 监听分辨率变化；返回的 EventsKey 在 destroy 中解绑。
      this.map.getView().on('change:resolution', () => {
        // 缩放过程中只切换图层显隐，不改写用户选择的渲染偏好；缩回阈值以下可恢复 Cluster。
        this.syncEventLayerVisibility()
      }),
      // Map.on 注册地图事件：moveend 在交互移动结束触发，rendercomplete 在本帧资源完成后触发。
      this.map.on('moveend', () => {
        emitViewportChange()
        emitStats()
      }),
      this.map.on('rendercomplete', emitRenderStats),
      this.map.on('pointermove', (event) => {
        // MapBrowserEvent.dragging 表示指针移动来自拖图；coordinate 是当前 View 投影下的 [x, y]。
        if (event.dragging) return
        const now = performance.now()
        if (now - this.lastPointerCoordinateEmittedAt < POINTER_COORDINATE_INTERVAL_MS) return
        this.lastPointerCoordinateEmittedAt = now
        // toLonLat 将默认 EPSG:3857 投影坐标转换为 [WGS84 经度, WGS84 纬度]。
        const [lng, lat] = toLonLat(event.coordinate)
        options.onPointerCoordinate?.([lng, lat])
      }),
    ]
  }

  /** 将已创建的唯一 Map 实例绑定到 DOM；Popup 元素不存在时地图仍可独立工作。 */
  mount(target: HTMLElement, popupElement?: HTMLElement): void {
    // 首屏渲染只能从绑定真实 DOM 后开始计时，避免把构造阶段的页面等待算入地图耗时。
    this.renderCompleteMs = null
    this.pendingRenderStartedAt = performance.now()
    // setTarget(HTMLElement) 绑定渲染容器并启动首屏渲染；传 undefined 可解除绑定。
    this.map.setTarget(target)
    target.addEventListener('pointerleave', this.handlePointerLeave)
    // Overlay.setElement 绑定实际 Popup DOM；undefined 表示 Overlay 暂无内容元素。
    this.popupOverlay.setElement(popupElement)
    this.mounted = true
    // updateSize() 重新读取容器像素尺寸，避免隐藏容器恢复后使用过期视口大小。
    this.map.updateSize()
    // updateSize 同步更新视口尺寸；微任务让 View 完成本轮状态归并后再计算首个 BBOX。
    queueMicrotask(() => {
      if (!this.mounted || this.destroyed) return
      const bbox = this.getViewportBbox()
      if (!bbox || this.isSameBbox(bbox, this.lastViewportBbox)) return
      this.lastViewportBbox = bbox
      this.onViewportChange?.(bbox)
    })
  }

  /** 定位并高亮业务事件；Cluster 模式会切换为普通点位以保证目标可见。 */
  focusEvent(eventId: string): void {
    // getFeatureById 按 Feature ID 索引查找；getGeometry().getCoordinates() 取得 Point 的 [x, y]。
    const feature = this.eventSource.getFeatureById(eventId)
    const coordinates = feature?.getGeometry()?.getCoordinates()
    if (!feature || !coordinates) return
    if (this.renderMode !== 'point') this.setRenderMode('point')
    this.selectedEventId = eventId
    this.updateSelection(feature)
    // Overlay.setPosition 将 Popup 锚定到事件投影坐标。
    this.popupOverlay.setPosition(coordinates)
    const view = this.map.getView()
    // View.animate 平滑更新视图；center 是投影坐标，zoom 是级别，duration 单位为毫秒。
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
    // createEmpty() 创建 [Infinity, Infinity, -Infinity, -Infinity] 空范围，供后续逐点扩展。
    const extent = createEmpty()
    let firstCoordinate: number[] | null = null
    let coordinateCount = 0
    const includeFeature = (feature: EventFeature | null): void => {
      const coordinate = feature?.getGeometry()?.getCoordinates()
      if (!coordinate) return
      firstCoordinate ??= coordinate
      coordinateCount += 1
      // extendCoordinate(extent, coordinate) 原地扩展范围以包含指定 [x, y] 坐标。
      extendCoordinate(extent, coordinate)
    }
    if (eventIds) {
      for (const eventId of eventIds) includeFeature(this.eventSource.getFeatureById(eventId))
    } else {
      // 直接遍历 Source，避免定位十万点时额外创建 Feature 与坐标数组。
      // forEachFeature(callback) 遍历 Source 当前全部 Feature。
      this.eventSource.forEachFeature(includeFeature)
    }
    if (coordinateCount === 0 || !firstCoordinate) return false

    const view = this.map.getView()
    if (coordinateCount === 1) {
      // 单点使用 animate，参数语义与 focusEvent 相同。
      view.animate({
        center: firstCoordinate,
        zoom: Math.max(view.getZoom() ?? EVENT_FOCUS_ZOOM, EVENT_FOCUS_ZOOM),
        duration: 450,
      })
      return true
    }

    // isEmpty(extent) 判断范围是否仍未被任何有效坐标扩展。
    if (isEmpty(extent)) return false
    // View.fit 计算能容纳 extent 的中心与分辨率；padding 为上右下左像素，maxZoom 防止过度放大。
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
    this.selectedEventId = null
    // setPosition(undefined) 清除 Overlay 锚点并隐藏 Popup。
    this.popupOverlay.setPosition(undefined)
    const sourceUpdateStartedAt = performance.now()
    // clear(fast=true) 快速移除全部 Feature，不逐个派发 removefeature 事件。
    this.eventSource.clear(true)
    // addFeatures 批量写入新集合并重建 Source 空间索引。
    this.eventSource.addFeatures(features)
    this.sourceUpdateMs = performance.now() - sourceUpdateStartedAt
    // rendercomplete 是异步信号，因此先保留批次起点，完成前向面板暴露 null。
    this.renderCompleteMs = null
    this.pendingRenderStartedAt = batchStartedAt
    this.eventSourceDiff = null
  }

  /**
   * 按业务事件 ID 增量同步当前视口数据；未变化和更新项均保留原 Feature 身份。
   */
  syncEvents(events: readonly InspectionEvent[]): EventSourceDiffStats {
    const batchStartedAt = performance.now()
    const diffStats = syncEventSource(this.eventSource, events, this.selectedEventId)
    this.eventSourceDiff = diffStats
    this.renderCompleteMs = null
    this.pendingRenderStartedAt = batchStartedAt

    if (diffStats.removedSelectedEventId) {
      this.selectedEventId = null
      this.updateSelection(null)
      this.popupOverlay.setPosition(undefined)
      this.onEventSelectInvalidated?.(diffStats.removedSelectedEventId)
    }

    return diffStats
  }

  /** 向当前可见 Source 增量加入事件；ID 已存在时返回 false，避免覆盖既有 Feature。 */
  addEvent(event: InspectionEvent): boolean {
    // getFeatureById 检查稳定 ID 是否已存在；addFeature 只加入一个新 Feature。
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
    // removeFeature 接收 Source 中的同一 Feature 实例，并更新空间索引及图层渲染。
    const feature = this.eventSource.getFeatureById(eventId)
    if (!feature) return false
    this.eventSource.removeFeature(feature)
    this.updateSelection(null)
    this.popupOverlay.setPosition(undefined)
    return true
  }

  /** 切换互斥渲染图层；独立 SelectionLayer 会跨渲染模式保留当前选中态。 */
  setRenderMode(mode: RenderMode): void {
    // renderMode 保存用户偏好；实际显示还受高倍数强制展开规则控制。
    this.renderMode = mode
    this.syncEventLayerVisibility()
    // Select 同时支持普通点和聚合点，仅由当前交互模式决定是否启用。
    this.interactionManager.setSelectActive(this.mapMode === 'select')
    // Map.render() 请求下一动画帧重绘，不会同步阻塞完成整个渲染。
    this.map.render()
  }

  /** 统一控制普通点和 Cluster 显隐，并继续保持当前渲染模式的互斥关系。 */
  setEventLayersVisible(visible: boolean): void {
    this.eventLayersVisible = visible
    this.syncEventLayerVisibility()
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
    // getTargetElement() 返回 Map 当前绑定的 HTMLElement；未挂载时返回 null。
    const targetElement = this.map.getTargetElement()
    if (targetElement) targetElement.style.cursor = 'crosshair'
    // Map.once 只监听下一次 singleclick 并自动解绑；返回 EventsKey 仍可用于提前取消。
    this.eventLocationPickKey = this.map.once('singleclick', (event) => {
      // singleclick 事件的 coordinate 是 View 投影坐标，toLonLat 转为业务经纬度。
      const [lng, lat] = toLonLat(event.coordinate)
      this.setEventDraftLocation([lng, lat])
      this.eventLocationPickKey = null
      this.restoreInteractionAfterLocationPick()
      onPick([lng, lat])
    })
  }

  /** 更新临时事件标记；坐标按 [WGS84 经度, WGS84 纬度] 排列，null 表示清除。 */
  setEventDraftLocation(coordinate: readonly [number, number] | null): void {
    // Feature.setGeometry 替换草稿几何；Point 接收投影坐标，undefined 表示不参与渲染。
    this.eventDraftFeature.setGeometry(
      // fromLonLat 将 [经度, 纬度] 转为默认 EPSG:3857 坐标。
      coordinate ? new Point(fromLonLat([...coordinate])) : undefined,
    )
    if (coordinate) this.startEventDraftPulse()
    else this.stopEventDraftPulse()
  }

  /** 取消尚未完成的地图选点；默认恢复进入选点前的空间交互模式。 */
  cancelEventLocationPick(restoreInteraction = true): void {
    const wasPicking = this.eventLocationPickKey !== null
    if (this.eventLocationPickKey) {
      // unByKey 通过 Map.once 返回的句柄提前解除尚未触发的单击监听。
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
    // getFeatures() 返回 Source 当前 Feature 快照；这里只允许一个区域，因此读取索引 0。
    const geometry = this.regionSource.getFeatures()[0]?.getGeometry()
    return geometry ? serializeRegionGeometry(geometry) : null
  }

  /** 载入、定位并重新计算一个已保存区域；传入数据不会保存 OpenLayers 实例。 */
  showRegion(regionGeometry: RegionGeometry): void {
    const geometry = deserializeRegionGeometry(regionGeometry)
    // clear() 移除旧区域；addFeature 写入一个持有反序列化 Geometry 的新 Feature。
    this.regionSource.clear()
    this.regionSource.addFeature(new Feature({ geometry }))
    this.interactionManager.evaluateRegion(geometry)
    // geometry.getExtent() 返回最小包围盒；View.fit 按 duration、maxZoom 与四边 padding 定位。
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
    const effectiveRenderMode = this.getEffectiveRenderMode()
    return {
      // getView().getZoom() 返回当前缩放级别；getFeatures() 返回 Source 要素快照用于计数。
      zoom: Number((this.map.getView().getZoom() ?? 0).toFixed(1)),
      featureCount:
        effectiveRenderMode === 'cluster'
          ? this.clusterSource.getFeatures().length
          : this.eventSource.getFeatures().length,
      renderMode: effectiveRenderMode,
      featureConversionMs: this.featureConversionMs,
      sourceUpdateMs: this.sourceUpdateMs,
      renderCompleteMs: this.renderCompleteMs,
      eventSourceDiff: this.eventSourceDiff,
    }
  }

  /** 返回当前地图视口的 WGS84 BBOX；未挂载或尺寸无效时返回 null。 */
  getViewportBbox(): Wgs84Bbox | null {
    if (!this.mounted || this.destroyed) return null
    // Map.getSize() 返回渲染视口 [宽度, 高度]，单位为 CSS 像素。
    const size = this.map.getSize()
    if (!size || size[0] <= 0 || size[1] <= 0) return null

    const view = this.map.getView()
    // calculateExtent(size) 计算当前视图投影范围；getProjection().getCode() 返回源 EPSG 编码。
    return calculateWgs84ViewportBbox(view.calculateExtent(size), view.getProjection().getCode())
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

  /** 跳转到轨迹总时长的指定比例；progressRatio 的合法范围为闭区间 [0, 1]。 */
  seekTrack(progressRatio: number): void {
    this.trackPlayback.seek(progressRatio)
  }

  /** 同步责任网格与轨迹节点状态；null 表示退出复盘并恢复普通地图语义。 */
  updateResponsibilityGridProgress(activeSequence: number | null): void {
    this.setResponsibilityGridProgress(activeSequence)
    this.setTrackCheckpointProgress(activeSequence)
  }

  /** 将完整巡检路线适配到视口；padding 按 [上, 右, 下, 左] 排列，单位为 CSS 像素。 */
  fitTrack(): void {
    // VectorSource.getExtent() 返回全部轨迹 Feature 的联合范围。
    const extent = this.trackSource.getExtent()
    if (!extent || !Number.isFinite(extent[0])) return
    // View.fit 的 padding 顺序为上右下左像素，duration 为毫秒，maxZoom 限制最大放大级别。
    this.map.getView().fit(extent, {
      padding: [72, 72, 72, 72],
      duration: 350,
      maxZoom: 14,
    })
  }

  /** 返回内部 Layer 供诊断和高级编排使用，调用方不得把实例写入 Pinia。 */
  getLayer(layerId: CoreLayerId): BaseLayer | undefined {
    return this.layerManager.getLayer(layerId)
  }
  /** 显示指定核心图层；普通点位与 Cluster 的业务互斥仍应通过 setRenderMode 控制。 */
  showLayer(layerId: CoreLayerId): void {
    this.layerManager.showLayer(layerId)
    // 场景切换会在同一任务内连续修改多个图层，显式请求渲染确保恢复后的轨迹立即出现。
    this.map.render()
  }
  /** 隐藏指定核心图层，不会清空对应 Source。 */
  hideLayer(layerId: CoreLayerId): void {
    this.layerManager.hideLayer(layerId)
    this.map.render()
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
    // Geometry.clone() 创建独立几何副本；Feature.setGeometry(undefined) 会隐藏选中标记。
    this.selectionFeature.setGeometry(feature?.getGeometry()?.clone())
  }

  private isSameBbox(next: Wgs84Bbox, previous: Wgs84Bbox | null): boolean {
    return previous !== null && next.every((coordinate, index) => coordinate === previous[index])
  }

  private getEffectiveRenderMode(): RenderMode {
    // View.getZoom() 返回当前缩放级别；若 View 尚未解析出级别则回退为 0。
    const zoom = this.map.getView().getZoom() ?? 0
    return this.renderMode === 'cluster' && zoom < CLUSTER_BREAK_ZOOM ? 'cluster' : 'point'
  }

  private syncEventLayerVisibility(): void {
    const effectiveRenderMode = this.getEffectiveRenderMode()
    // Layer.setVisible 只切换渲染状态，不移除图层，也不释放 Source 数据。
    this.eventLayer.setVisible(this.eventLayersVisible && effectiveRenderMode === 'point')
    this.clusterLayer.setVisible(this.eventLayersVisible && effectiveRenderMode === 'cluster')
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
    if (this.mounted) {
      // getTargetElement 取得已绑定容器；setTarget(undefined) 停止地图在该 DOM 中渲染。
      this.map.getTargetElement()?.removeEventListener('pointerleave', this.handlePointerLeave)
      this.map.setTarget(undefined)
    }
    // unByKey 接收 EventsKey 数组，批量解除 View 与 Map 上注册的 Observable 监听。
    unByKey(this.listenerKeys)
    this.interactionManager.destroy()
    this.trackPlayback.destroy()
    // Overlay.setElement(undefined) 解除 DOM 引用；removeOverlay 再解除 Map 对 Overlay 的持有。
    this.popupOverlay.setElement(undefined)
    this.map.removeOverlay(this.popupOverlay)
    this.updateSelection(null)
    this.selectedEventId = null
    this.lastViewportBbox = null
    this.setEventDraftLocation(null)
    // clear(true) 快速清空海量事件 Feature；setSource(null) 解除 ClusterSource 对原 Source 的引用。
    this.eventSource.clear(true)
    // 主动解除 ClusterSource 对事件 Source 的引用，便于大数据集合及时回收。
    this.clusterSource.setSource(null)
    this.layerManager.destroy()
    this.mounted = false
    this.destroyed = true
  }
}
