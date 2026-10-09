<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import 'ol/ol.css'
import { MapManager } from '../map/MapManager'
import type { MapStats, RenderMode } from '../map/MapManager'
import type { DrawGeometryType, MapMode } from '../map/interactions/SpatialInteractionManager'
import {
  EVENT_LEVEL_VISUALS,
  EVENT_SELECTION_COLOR,
  EVENT_STATUS_VISUALS,
} from '../map/styles/event-visual'
import { generateInspectionEvents } from '../mock/generate-events'
import { mockInspectionTrack } from '../mock/tracks'
import {
  parseInspectionEventsGeoJson,
  serializeInspectionEventsToGeoJson,
} from '../services/export-events'
import { useGisStore } from '../stores/gis'
import type { EventLevel, EventStatus, EventType } from '../types/inspection-event'
import type { Wgs84Coordinate } from '../types/region'
import type { TrackPlaybackSpeed, TrackPlaybackStatus } from '../types/track'

const TYPE_LABELS = {
  ROAD_DAMAGE: '道路破损',
  LIGHT_FAILURE: '路灯故障',
  GARBAGE: '垃圾堆积',
  MANHOLE: '井盖异常',
} as const
const LEVEL_LABELS = { HIGH: '高等级', MEDIUM: '中等级', LOW: '低等级' } as const
const EVENT_TYPES = Object.keys(TYPE_LABELS) as EventType[]
const EVENT_STATUSES = Object.keys(EVENT_STATUS_VISUALS) as EventStatus[]
const EVENT_LEVELS = Object.keys(LEVEL_LABELS) as EventLevel[]
/** 每页最多创建 100 个事件按钮，避免海量结果把分页收益重新变成 DOM 压力。 */
const EVENT_LIST_PAGE_SIZE = 100
type EventListSort =
  | 'CREATED_DESC' // 按 ISO 上报时间降序，时间相同时以事件 ID 保持稳定顺序。
  | 'CREATED_ASC' // 按 ISO 上报时间升序，便于追溯最早积压事件。
  | 'LEVEL_DESC' // 按 HIGH、MEDIUM、LOW 排列，高等级事件优先。
  | 'STATUS_PENDING_FIRST' // 按待处理、处理中、已完成排列，未闭环事件优先。
const EVENT_LIST_SORT_OPTIONS: readonly { value: EventListSort; label: string }[] = [
  { value: 'CREATED_DESC', label: '上报时间：最新优先' },
  { value: 'CREATED_ASC', label: '上报时间：最早优先' },
  { value: 'LEVEL_DESC', label: '紧急程度：高优先' },
  { value: 'STATUS_PENDING_FIRST', label: '处理状态：待处理优先' },
]
const EVENT_LEVEL_PRIORITY: Record<EventLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
const EVENT_STATUS_PRIORITY: Record<EventStatus, number> = { PENDING: 0, PROCESSING: 1, DONE: 2 }
const EVENT_CREATED_AT_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
type LayerControlId = 'base' | 'events' | 'track' | 'region' | 'selection'
const LAYER_CONTROLS: readonly { id: LayerControlId; label: string }[] = [
  { id: 'base', label: '底图' },
  { id: 'events', label: '事件' },
  { id: 'track', label: '轨迹' },
  { id: 'region', label: '绘制区域' },
  { id: 'selection', label: '选中高亮' },
]
const statusLegend = Object.values(EVENT_STATUS_VISUALS)
const selectionLegendStyle = { '--legend-color': EVENT_SELECTION_COLOR }

const mapTarget = ref<HTMLElement | null>(null)
const popupElement = ref<HTMLElement | null>(null)
const eventListElement = ref<HTMLElement | null>(null)
const store = useGisStore()
const selectedEvent = computed(() => store.selectedEvent)
interface EventFormDraft {
  type: EventType
  level: EventLevel
  address: string
  /** WGS84 经度，合法范围为闭区间 [-180, 180]。 */
  lng: number
  /** WGS84 纬度，合法范围为闭区间 [-90, 90]。 */
  lat: number
}

const createDefaultEventDraft = (): EventFormDraft => ({
  type: 'ROAD_DAMAGE',
  level: 'MEDIUM',
  address: '',
  lng: 121.4737,
  lat: 31.2304,
})
const eventFormOpen = ref(false)
/** null 表示创建事件，否则为正在编辑且保持不变的业务 ID。 */
const editingEventId = ref<string | null>(null)
const eventForm = reactive<EventFormDraft>(createDefaultEventDraft())
const eventFormError = ref('')
const isPickingEventLocation = ref(false)
/** 保存进入二次确认时的事件 ID，避免选择变化后误删另一条事件。 */
const deleteCandidateId = ref<string | null>(null)
const importFeedback = ref<{ message: string; error: boolean } | null>(null)
const statusActionLabel = computed(() => {
  if (selectedEvent.value?.status === 'PENDING') return '开始处理'
  if (selectedEvent.value?.status === 'PROCESSING') return '标记完成'
  return null
})
const canSaveCurrentRegion = computed(
  () => store.regionEventIds !== null && store.activeRegionId === null,
)
const scopedEvents = computed(() => {
  if (store.regionEventIds === null) return store.filteredEvents
  const selectedIds = new Set(store.regionEventIds)
  return store.filteredEvents.filter((event) => selectedIds.has(event.id))
})
const eventListPage = ref(1)
const eventListPageInput = ref('1')
const eventListSort = ref<EventListSort>('CREATED_DESC')
const eventListPageCount = computed(() =>
  Math.max(1, Math.ceil(scopedEvents.value.length / EVENT_LIST_PAGE_SIZE)),
)
const eventListRange = computed(() => {
  if (scopedEvents.value.length === 0) return { start: 0, end: 0 }
  const start = (eventListPage.value - 1) * EVENT_LIST_PAGE_SIZE
  return {
    start: start + 1,
    end: Math.min(start + EVENT_LIST_PAGE_SIZE, scopedEvents.value.length),
  }
})
const sortedScopedEvents = computed(() => {
  const events = [...scopedEvents.value]
  events.sort((left, right) => {
    let difference = 0
    if (eventListSort.value === 'CREATED_DESC') {
      difference = right.createdAt.localeCompare(left.createdAt)
    } else if (eventListSort.value === 'CREATED_ASC') {
      difference = left.createdAt.localeCompare(right.createdAt)
    } else if (eventListSort.value === 'LEVEL_DESC') {
      difference = EVENT_LEVEL_PRIORITY[left.level] - EVENT_LEVEL_PRIORITY[right.level]
    } else {
      difference = EVENT_STATUS_PRIORITY[left.status] - EVENT_STATUS_PRIORITY[right.status]
    }
    // 相同业务排序值用唯一 ID 兜底，确保翻页过程中顺序确定且不会抖动。
    return difference || left.id.localeCompare(right.id)
  })
  return events
})
// 地图和导出使用完整结果；列表只渲染当前页，兼顾全量可访问性与 DOM 上限。
const visibleEvents = computed(() => {
  const start = (eventListPage.value - 1) * EVENT_LIST_PAGE_SIZE
  return sortedScopedEvents.value.slice(start, start + EVENT_LIST_PAGE_SIZE)
})
const statusCounts = computed(() => {
  const counts: Record<EventStatus, number> = { PENDING: 0, PROCESSING: 0, DONE: 0 }
  for (const event of store.events) counts[event.status] += 1
  return counts
})
const regionStatusCounts = computed(() => {
  const counts: Record<EventStatus, number> = { PENDING: 0, PROCESSING: 0, DONE: 0 }
  if (store.regionEventIds === null) return counts
  const regionIds = new Set(store.regionEventIds)
  for (const event of store.events) {
    if (regionIds.has(event.id)) counts[event.status] += 1
  }
  return counts
})
// 空字符串是原生 select 的“全部”值，应用时转换为业务筛选协议中的 null。
const filterDraft = reactive({
  keyword: store.eventFilter.keyword,
  type: (store.eventFilter.type ?? '') as EventType | '',
  status: (store.eventFilter.status ?? '') as EventStatus | '',
  level: (store.eventFilter.level ?? '') as EventLevel | '',
})
const layerVisibility = reactive<Record<LayerControlId, boolean>>({
  base: true,
  events: true,
  track: true,
  region: true,
  selection: true,
})
const dataCount = ref(10_000)
const renderMode = ref<RenderMode>('cluster')
const stats = ref<MapStats>({
  zoom: 12,
  featureCount: 0,
  renderMode: 'cluster',
  featureConversionMs: 0,
  sourceUpdateMs: 0,
  renderCompleteMs: null,
})
const pointerCoordinate = ref<Wgs84Coordinate | null>(null)
const formattedPointerCoordinate = computed(() => {
  const coordinate = pointerCoordinate.value
  return coordinate ? `${coordinate[0].toFixed(6)}, ${coordinate[1].toFixed(6)}` : '—'
})
/** 最近一次生成 mock 业务事件的同步耗时，单位为毫秒。 */
const dataGenerationMs = ref(0)
const mapMode = ref<MapMode>('select')
const drawType = ref<DrawGeometryType>('Polygon')
const trackSpeed = ref<TrackPlaybackSpeed>(1)
const trackStatus = ref<TrackPlaybackStatus>('idle')
const trackTime = ref(mockInspectionTrack[0]?.timestamp ?? 0)
const formattedTrackTime = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(trackTime.value),
)
let mapManager: MapManager | null = null

watch(
  () => store.selectedEventId,
  async (eventId) => {
    deleteCandidateId.value = null
    if (!eventId) return
    const selectedIndex = sortedScopedEvents.value.findIndex((event) => event.id === eventId)
    if (selectedIndex < 0) return
    // 地图选择可能命中任意分页；先切换页码，再等待 Vue 渲染对应事件按钮。
    eventListPage.value = Math.floor(selectedIndex / EVENT_LIST_PAGE_SIZE) + 1
    await nextTick()
    eventListElement.value
      ?.querySelector<HTMLElement>('[data-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  },
)

watch(eventListPageCount, (pageCount) => {
  // 删除或筛选可能让末页消失，此时回退到新的最后一页，避免出现空白页。
  eventListPage.value = Math.min(eventListPage.value, pageCount)
})

watch(eventListPage, (page) => {
  eventListPageInput.value = String(page)
})

/** 性能面板统一保留一位小数，低于计时器分辨率的耗时仍显示为 0.0 ms。 */
function formatDuration(durationMs: number): string {
  return `${durationMs.toFixed(1)} ms`
}

function formatActivityTime(isoTime: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoTime))
}

function formatEventCreatedAt(isoTime: string): string {
  const timestamp = Date.parse(isoTime)
  // 导入数据虽已校验时间，但展示层仍保留降级文案，避免异常业务数据污染整页渲染。
  return Number.isFinite(timestamp) ? EVENT_CREATED_AT_FORMATTER.format(timestamp) : '时间未知'
}

function generateEvents(count: number) {
  const startedAt = performance.now()
  const events = generateInspectionEvents(count)
  dataGenerationMs.value = performance.now() - startedAt
  return events
}

function syncVisibleEvents() {
  mapManager?.setEvents(store.filteredEvents)
  // 当前区域保留在 RegionSource 中；事件集合变化后必须重新计算包含关系和数量。
  mapManager?.reevaluateCurrentRegion()
}

function selectFromList(eventId: string) {
  if (renderMode.value === 'cluster') changeRenderMode('point')
  store.selectEvent(eventId)
  mapManager?.focusEvent(eventId)
}

function openCreateEventForm() {
  mapManager?.setEventDraftLocation(null)
  editingEventId.value = null
  Object.assign(eventForm, createDefaultEventDraft())
  eventFormError.value = ''
  eventFormOpen.value = true
}

function openEditEventForm() {
  const event = selectedEvent.value
  if (!event) return
  editingEventId.value = event.id
  Object.assign(eventForm, {
    type: event.type,
    level: event.level,
    address: event.address,
    lng: event.lng,
    lat: event.lat,
  })
  mapManager?.setEventDraftLocation([event.lng, event.lat])
  eventFormError.value = ''
  eventFormOpen.value = true
}

function closeEventForm() {
  mapManager?.cancelEventLocationPick()
  isPickingEventLocation.value = false
  mapManager?.setEventDraftLocation(null)
  eventFormOpen.value = false
  editingEventId.value = null
  eventFormError.value = ''
}

function validateEventForm(): boolean {
  if (!Number.isFinite(eventForm.lng) || eventForm.lng < -180 || eventForm.lng > 180) {
    eventFormError.value = '经度必须在 -180 到 180 之间'
    return false
  }
  if (!Number.isFinite(eventForm.lat) || eventForm.lat < -90 || eventForm.lat > 90) {
    eventFormError.value = '纬度必须在 -90 到 90 之间'
    return false
  }
  eventFormError.value = ''
  return true
}

function pickEventLocationFromMap() {
  if (!mapManager) return
  isPickingEventLocation.value = true
  eventFormError.value = ''
  mapManager.startEventLocationPick(([lng, lat]) => {
    // 表单保留六位小数，约为城市巡检场景下的亚米级经纬度输入精度。
    eventForm.lng = Number(lng.toFixed(6))
    eventForm.lat = Number(lat.toFixed(6))
    isPickingEventLocation.value = false
  })
}

function saveEventForm() {
  if (!validateEventForm()) return
  const changes = {
    type: eventForm.type,
    level: eventForm.level,
    // 未填写文字描述时使用坐标生成可识别标签，地图选点无需再强制手工输入地址。
    address:
      eventForm.address.trim() ||
      `地图选点 ${eventForm.lng.toFixed(6)}, ${eventForm.lat.toFixed(6)}`,
    lng: eventForm.lng,
    lat: eventForm.lat,
  }
  let savedEventId: string

  if (editingEventId.value) {
    const updatedEvent = store.updateEvent(editingEventId.value, changes)
    if (!updatedEvent) {
      eventFormError.value = '事件不存在，无法保存'
      return
    }
    savedEventId = updatedEvent.id
    const remainsVisible = store.filteredEvents.some((event) => event.id === updatedEvent.id)
    // 编辑可能让事件进入或离开当前筛选结果；仅在仍可见且 Feature 存在时走增量更新。
    if (!remainsVisible || !mapManager?.updateEvent(updatedEvent)) syncVisibleEvents()
  } else {
    const createdEvent = {
      id: `EVT-MANUAL-${Date.now()}`,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      ...changes,
    }
    if (!store.addEvent(createdEvent)) {
      eventFormError.value = '事件 ID 冲突，请重试'
      return
    }
    savedEventId = createdEvent.id
    if (store.filteredEvents.some((event) => event.id === createdEvent.id)) {
      mapManager?.addEvent(createdEvent)
    }
  }

  mapManager?.reevaluateCurrentRegion()
  const isVisible = store.filteredEvents.some((event) => event.id === savedEventId)
  store.selectEvent(isVisible ? savedEventId : null)
  if (isVisible) mapManager?.focusEvent(savedEventId)
  closeEventForm()
}

function requestDeleteSelectedEvent() {
  deleteCandidateId.value = store.selectedEventId
}

function cancelDeleteEvent() {
  deleteCandidateId.value = null
}

function confirmDeleteEvent() {
  const eventId = deleteCandidateId.value
  // 二次确认期间选择若发生变化则拒绝删除，确保目标仍是用户刚才看到的事件。
  if (!eventId || store.selectedEventId !== eventId) {
    cancelDeleteEvent()
    return
  }
  if (!store.removeEvent(eventId)) {
    cancelDeleteEvent()
    return
  }
  mapManager?.removeEvent(eventId)
  mapManager?.reevaluateCurrentRegion()
  cancelDeleteEvent()
}

function changeDataCount(count: number) {
  // 数据生成与 Feature 替换由用户主动触发，避免响应式深层监听反复重建地图对象。
  dataCount.value = count
  const events = generateEvents(count)
  store.setEvents(events)
  store.selectEvent(null)
  store.selectRegionEvents(null)
  eventListPage.value = 1
  syncVisibleEvents()
}

function applyEventFilter() {
  store.setEventFilter({
    keyword: filterDraft.keyword,
    type: filterDraft.type || null,
    status: filterDraft.status || null,
    level: filterDraft.level || null,
  })
  // 筛选后旧选择和空间范围结果可能已不可见，统一清除以避免详情与地图状态不一致。
  store.selectEvent(null)
  store.selectRegionEvents(null)
  eventListPage.value = 1
  syncVisibleEvents()
}

function resetEventFilter() {
  filterDraft.keyword = ''
  filterDraft.type = ''
  filterDraft.status = ''
  filterDraft.level = ''
  store.resetEventFilter()
  store.selectEvent(null)
  store.selectRegionEvents(null)
  eventListPage.value = 1
  syncVisibleEvents()
}

function changeEventListPage(page: number) {
  // 页码只允许落在闭区间 [1, pageCount]，防止快速点击造成越界空页。
  eventListPage.value = Math.min(Math.max(page, 1), eventListPageCount.value)
}

function jumpToEventListPage() {
  const requestedPage = Number(eventListPageInput.value)
  if (!Number.isFinite(requestedPage)) {
    eventListPageInput.value = String(eventListPage.value)
    return
  }
  // 页码从 1 开始且只接受整数；小数向下取整后再交给统一边界逻辑处理。
  changeEventListPage(Math.floor(requestedPage))
  eventListPageInput.value = String(eventListPage.value)
}

function changeEventListSort() {
  // 排序规则改变后回到第一屏，避免用户停留在相同页码却误以为结果缺失。
  eventListPage.value = 1
}

function exportCurrentEvents() {
  if (scopedEvents.value.length === 0) return
  const geoJson = serializeInspectionEventsToGeoJson(scopedEvents.value)
  const blob = new Blob([JSON.stringify(geoJson, null, 2)], {
    type: 'application/geo+json;charset=utf-8',
  })
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `inspection-events-${new Date().toISOString().slice(0, 10)}.geojson`
  document.body.append(link)
  link.click()
  link.remove()
  // 下载已触发后延迟到下一任务释放，兼容仍需读取 Blob URL 的浏览器实现。
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
}

function fitCurrentEvents() {
  // Source 已应用基础筛选；存在空间区域时再用业务 ID 将定位范围收窄到区域结果。
  mapManager?.fitEvents(store.regionEventIds ?? undefined)
}

async function importGeoJson(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  // 50 MiB 上限用于避免用户误选超大文件后长时间阻塞主线程和占用过多内存。
  if (file.size > 50 * 1024 * 1024) {
    importFeedback.value = { message: '导入失败：文件不能超过 50 MiB', error: true }
    return
  }
  try {
    const parsed = parseInspectionEventsGeoJson(JSON.parse(await file.text()) as unknown)
    const result = store.addEvents(parsed.events)
    if (result.addedEvents.length > 0) {
      syncVisibleEvents()
      const addedIds = new Set(result.addedEvents.map((addedEvent) => addedEvent.id))
      const visibleAddedIds = scopedEvents.value
        .filter((visibleEvent) => addedIds.has(visibleEvent.id))
        .map((visibleEvent) => visibleEvent.id)
      // 仅定位当前筛选与空间范围内的新数据，避免导入后视角跳向用户看不到的结果。
      mapManager?.fitEvents(visibleAddedIds)
    }
    importFeedback.value = {
      message: `已导入 ${result.addedEvents.length} 条，跳过 ${parsed.rejectedCount + result.skippedCount} 条`,
      error: result.addedEvents.length === 0,
    }
  } catch (error) {
    importFeedback.value = {
      message: `导入失败：${error instanceof Error ? error.message : '无法解析文件'}`,
      error: true,
    }
  }
}

function advanceSelectedEventStatus() {
  const eventId = store.selectedEventId
  if (!eventId) return
  const updatedEvent = store.advanceEventStatus(eventId)
  if (!updatedEvent) return

  const remainsVisible = store.filteredEvents.some((event) => event.id === updatedEvent.id)
  if (remainsVisible && mapManager?.updateEvent(updatedEvent)) return

  // 状态筛选可能在流转后排除当前事件，此时批量同步可见 Source 并清除失效选择。
  store.selectEvent(null)
  store.selectRegionEvents(null)
  syncVisibleEvents()
}

function batchAdvanceRegionEvents(fromStatus: Exclude<EventStatus, 'DONE'>) {
  if (store.regionEventIds === null) return
  const updatedEvents = store.advanceEventStatuses(store.regionEventIds, fromStatus)
  if (updatedEvents.length === 0) return
  // 状态筛选可能排除批量更新后的事件，整体同步一次比逐条维护可见 Source 更稳定。
  store.selectEvent(null)
  syncVisibleEvents()
}

function applyLayerVisibility(layerId: LayerControlId) {
  const visible = layerVisibility[layerId]
  if (layerId === 'events') {
    // EventLayer 与 ClusterLayer 是同一业务图层的两种渲染模式，必须作为一个开关处理。
    mapManager?.setEventLayersVisible(visible)
    return
  }
  if (visible) mapManager?.showLayer(layerId)
  else mapManager?.hideLayer(layerId)
}

function saveCurrentRegion() {
  const geometry = mapManager?.getCurrentRegionGeometry()
  if (!geometry || store.regionEventIds === null) return
  const customRegionCount = store.regions.filter((region) =>
    region.id.startsWith('REGION-CUSTOM-'),
  ).length
  store.saveRegion({
    id: `REGION-CUSTOM-${Date.now()}`,
    name: `自定义巡检区 ${customRegionCount + 1}`,
    geometry,
    eventIds: [...store.regionEventIds],
    createdAt: new Date().toISOString(),
  })
}

function showSavedRegion(regionId: string) {
  const region = store.regions.find((item) => item.id === regionId)
  if (!region) return
  store.selectSavedRegion(regionId)
  eventListPage.value = 1
  mapMode.value = 'modify'
  mapManager?.setInteractionMode('modify')
  mapManager?.showRegion(region.geometry)
}

function removeSavedRegion(regionId: string) {
  const removesActiveRegion = store.activeRegionId === regionId
  store.removeRegion(regionId)
  if (!removesActiveRegion) return
  store.selectRegionEvents(null)
  mapManager?.clearRegion()
}

function changeMapMode(mode: MapMode, geometryType: DrawGeometryType = drawType.value) {
  mapMode.value = mode
  drawType.value = geometryType
  if (mode === 'draw') store.selectSavedRegion(null)
  if (mode === 'select' && renderMode.value === 'cluster') changeRenderMode('point')
  mapManager?.setInteractionMode(mode, geometryType)
}

function changeRenderMode(mode: RenderMode) {
  renderMode.value = mode
  store.selectEvent(null)
  mapManager?.setRenderMode(mode)
}

function changeTrackSpeed(speed: TrackPlaybackSpeed) {
  trackSpeed.value = speed
  mapManager?.setTrackSpeed(speed)
}

onMounted(() => {
  const events = generateEvents(dataCount.value)
  store.setEvents(events)
  // 页面重新挂载时沿用 Pinia 中的筛选条件，避免列表和地图展示范围不一致。
  const initialEvents = store.filteredEvents
  mapManager = new MapManager({
    events: initialEvents,
    onEventSelect: store.selectEvent,
    onStatsChange: (nextStats) => {
      stats.value = nextStats
    },
    onPointerCoordinate: (coordinate) => {
      pointerCoordinate.value = coordinate
    },
    onRegionSelect: (eventIds) => {
      store.selectRegionEvents(eventIds)
      eventListPage.value = 1
      const regionId = store.activeRegionId
      const geometry = mapManager?.getCurrentRegionGeometry()
      if (regionId && geometry && eventIds) store.updateRegion(regionId, geometry, eventIds)
    },
    trackPoints: mockInspectionTrack,
    onTrackTimeChange: (timestamp, status) => {
      trackTime.value = timestamp
      trackStatus.value = status
    },
  })
  mapManager.setRenderMode(renderMode.value)
  if (mapTarget.value) mapManager.mount(mapTarget.value, popupElement.value ?? undefined)
})

onBeforeUnmount(() => {
  mapManager?.destroy()
  mapManager = null
})
</script>

<template>
  <section class="gis-shell">
    <header class="gis-header">
      <div>
        <small>URBAN INSPECTION CENTER</small>
        <h2>城市巡检 GIS 综合管理平台</h2>
      </div>
      <span class="online">● 系统在线</span>
    </header>
    <div class="gis-workspace">
      <aside ref="eventListElement" class="event-list">
        <header>
          <strong>巡检事件</strong>
          <span>
            {{
              store.regionEventIds !== null
                ? `区域内 ${store.regionEventIds.length}`
                : `${store.filteredEvents.length}/${store.events.length} 条`
            }}
          </span>
        </header>
        <form class="event-filters" @submit.prevent="applyEventFilter">
          <input v-model="filterDraft.keyword" type="search" placeholder="事件 ID / 地址" />
          <div class="filter-grid">
            <select v-model="filterDraft.status" aria-label="处理状态">
              <option value="">全部状态</option>
              <option v-for="status in EVENT_STATUSES" :key="status" :value="status">
                {{ EVENT_STATUS_VISUALS[status].label }}
              </option>
            </select>
            <select v-model="filterDraft.type" aria-label="事件类型">
              <option value="">全部类型</option>
              <option v-for="type in EVENT_TYPES" :key="type" :value="type">
                {{ TYPE_LABELS[type] }}
              </option>
            </select>
            <select v-model="filterDraft.level" aria-label="紧急程度">
              <option value="">全部紧急程度</option>
              <option v-for="level in EVENT_LEVELS" :key="level" :value="level">
                {{ LEVEL_LABELS[level] }}
              </option>
            </select>
          </div>
          <div class="filter-actions">
            <button type="submit">应用筛选</button>
            <button type="button" @click="resetEventFilter">重置</button>
          </div>
          <label class="event-sort">
            <span>列表排序</span>
            <select v-model="eventListSort" aria-label="事件列表排序" @change="changeEventListSort">
              <option
                v-for="option in EVENT_LIST_SORT_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <button
            class="event-fit"
            type="button"
            :disabled="scopedEvents.length === 0"
            @click="fitCurrentEvents"
          >
            定位当前结果（{{ scopedEvents.length.toLocaleString() }}）
          </button>
          <button
            class="event-export"
            type="button"
            :disabled="scopedEvents.length === 0"
            @click="exportCurrentEvents"
          >
            导出当前结果 GeoJSON（{{ scopedEvents.length.toLocaleString() }}）
          </button>
          <label class="event-import">
            导入事件 GeoJSON
            <input
              type="file"
              accept=".geojson,application/geo+json,application/json"
              @change="importGeoJson"
            />
          </label>
          <p v-if="importFeedback" class="import-feedback" :class="{ error: importFeedback.error }">
            {{ importFeedback.message }}
          </p>
          <div class="status-summary" aria-label="事件状态统计">
            <span v-for="status in EVENT_STATUSES" :key="status">
              <i :style="{ backgroundColor: EVENT_STATUS_VISUALS[status].color }"></i>
              {{ EVENT_STATUS_VISUALS[status].label }} {{ statusCounts[status].toLocaleString() }}
            </span>
          </div>
        </form>
        <p v-if="visibleEvents.length === 0" class="filter-empty">当前条件下没有巡检事件</p>
        <nav v-else class="event-pagination" aria-label="事件列表分页">
          <span class="event-pagination-summary">
            {{ eventListRange.start.toLocaleString() }}–{{ eventListRange.end.toLocaleString() }} /
            {{ scopedEvents.length.toLocaleString() }} · 第 {{ eventListPage }} /
            {{ eventListPageCount }} 页
          </span>
          <button
            type="button"
            :disabled="eventListPage === 1"
            aria-label="首页"
            @click="changeEventListPage(1)"
          >
            «
          </button>
          <button
            type="button"
            :disabled="eventListPage === 1"
            aria-label="上一页"
            @click="changeEventListPage(eventListPage - 1)"
          >
            ‹
          </button>
          <form class="event-page-jump" @submit.prevent="jumpToEventListPage">
            <input
              v-model="eventListPageInput"
              type="number"
              inputmode="numeric"
              min="1"
              :max="eventListPageCount"
              step="1"
              aria-label="目标页码"
            />
            <button type="submit">跳转</button>
          </form>
          <button
            type="button"
            :disabled="eventListPage === eventListPageCount"
            aria-label="下一页"
            @click="changeEventListPage(eventListPage + 1)"
          >
            ›
          </button>
          <button
            type="button"
            :disabled="eventListPage === eventListPageCount"
            aria-label="末页"
            @click="changeEventListPage(eventListPageCount)"
          >
            »
          </button>
        </nav>
        <button
          v-for="event in visibleEvents"
          :key="event.id"
          :class="{ active: event.id === store.selectedEventId }"
          :data-selected="event.id === store.selectedEventId ? 'true' : undefined"
          @click="selectFromList(event.id)"
        >
          <span
            class="level"
            :style="{ backgroundColor: EVENT_STATUS_VISUALS[event.status].color }"
          ></span>
          <span class="event-list-main">
            <span class="event-list-title">
              <strong>{{ TYPE_LABELS[event.type] }}</strong>
              <b>{{ LEVEL_LABELS[event.level] }}</b>
            </span>
            <small class="event-list-id">{{ event.id }}</small>
            <small>{{ event.address }}</small>
          </span>
          <span class="event-list-side">
            <em :style="{ color: EVENT_STATUS_VISUALS[event.status].color }">
              {{ EVENT_STATUS_VISUALS[event.status].label }}
            </em>
            <time :datetime="event.createdAt">{{ formatEventCreatedAt(event.createdAt) }}</time>
          </span>
        </button>
      </aside>
      <main class="map-panel">
        <div ref="mapTarget" class="map-canvas"></div>
        <section class="map-legend" aria-label="地图点位图例">
          <strong>点位图例</strong>
          <div class="legend-group">
            <span class="legend-title">处置状态</span>
            <span v-for="item in statusLegend" :key="item.label" class="legend-item">
              <i class="legend-level" :style="{ '--legend-color': item.color }"></i>
              {{ item.label }}
            </span>
          </div>
          <div class="legend-group">
            <span class="legend-title">当前选择</span>
            <span class="legend-item">
              <i class="legend-status legend-selection" :style="selectionLegendStyle"></i>
              青色光圈
            </span>
          </div>
        </section>
        <section class="layer-panel" aria-label="地图图层控制">
          <strong>图层控制</strong>
          <label v-for="item in LAYER_CONTROLS" :key="item.id">
            <input
              v-model="layerVisibility[item.id]"
              type="checkbox"
              @change="applyLayerVisibility(item.id)"
            />
            <span>{{ item.label }}</span>
          </label>
        </section>
        <div ref="popupElement" class="map-popup" :class="{ visible: selectedEvent }">
          <template v-if="selectedEvent">
            <strong>{{ TYPE_LABELS[selectedEvent.type] }}</strong>
            <span>{{ selectedEvent.id }} · {{ selectedEvent.address }}</span>
          </template>
        </div>
      </main>
      <aside class="event-detail">
        <header>
          <strong>
            {{ eventFormOpen ? (editingEventId ? '编辑事件' : '新建事件') : '事件详情' }}
          </strong>
          <button
            v-if="!eventFormOpen"
            class="detail-create"
            type="button"
            @click="openCreateEventForm"
          >
            新建
          </button>
        </header>
        <form v-if="eventFormOpen" class="event-editor" @submit.prevent="saveEventForm">
          <label>
            <span>事件类型</span>
            <select v-model="eventForm.type">
              <option v-for="type in EVENT_TYPES" :key="type" :value="type">
                {{ TYPE_LABELS[type] }}
              </option>
            </select>
          </label>
          <label>
            <span>紧急程度</span>
            <select v-model="eventForm.level">
              <option v-for="level in EVENT_LEVELS" :key="level" :value="level">
                {{ LEVEL_LABELS[level] }}
              </option>
            </select>
          </label>
          <label>
            <span>位置描述（可选）</span>
            <input
              v-model="eventForm.address"
              type="text"
              maxlength="80"
              placeholder="未填写时使用选点坐标"
            />
          </label>
          <button
            class="map-location-picker"
            :class="{ active: isPickingEventLocation }"
            type="button"
            @click="pickEventLocationFromMap"
          >
            {{ isPickingEventLocation ? '请点击地图选择位置…' : '在地图上选择位置' }}
          </button>
          <div class="coordinate-fields">
            <label>
              <span>WGS84 经度</span>
              <input
                v-model.number="eventForm.lng"
                type="number"
                min="-180"
                max="180"
                step="0.000001"
              />
            </label>
            <label>
              <span>WGS84 纬度</span>
              <input
                v-model.number="eventForm.lat"
                type="number"
                min="-90"
                max="90"
                step="0.000001"
              />
            </label>
          </div>
          <p v-if="eventFormError" class="event-editor-error">{{ eventFormError }}</p>
          <div class="event-editor-actions">
            <button type="button" @click="closeEventForm">取消</button>
            <button type="submit">保存事件</button>
          </div>
        </form>
        <template v-else-if="selectedEvent">
          <div class="detail-id">{{ selectedEvent.id }}</div>
          <dl>
            <dt>事件类型</dt>
            <dd>{{ TYPE_LABELS[selectedEvent.type] }}</dd>
            <dt>处理状态</dt>
            <dd :style="{ color: EVENT_STATUS_VISUALS[selectedEvent.status].color }">
              {{ EVENT_STATUS_VISUALS[selectedEvent.status].label }}
            </dd>
            <dt>紧急程度</dt>
            <dd>{{ EVENT_LEVEL_VISUALS[selectedEvent.level].label }}</dd>
            <dt>上报位置</dt>
            <dd>{{ selectedEvent.address }}</dd>
            <dt>上报时间</dt>
            <dd>{{ selectedEvent.createdAt }}</dd>
          </dl>
          <button
            v-if="statusActionLabel"
            class="status-action"
            type="button"
            @click="advanceSelectedEventStatus"
          >
            {{ statusActionLabel }}
          </button>
          <div v-else class="status-finished" aria-label="该事件已完成处置">
            <i aria-hidden="true"></i>
            <span>
              <small>处理状态</small>
              <strong>已完成</strong>
            </span>
          </div>
          <div class="event-detail-actions">
            <button class="event-edit" type="button" @click="openEditEventForm">编辑事件</button>
            <button class="event-delete" type="button" @click="requestDeleteSelectedEvent">
              删除事件
            </button>
          </div>
          <div v-if="deleteCandidateId" class="delete-confirmation" role="alert">
            <strong>确认删除 {{ deleteCandidateId }}？</strong>
            <span>删除后无法在当前演示数据中恢复。</span>
            <div>
              <button type="button" @click="cancelDeleteEvent">取消</button>
              <button type="button" @click="confirmDeleteEvent">确认删除</button>
            </div>
          </div>
          <section class="event-timeline" aria-label="事件处置记录">
            <strong>处置记录</strong>
            <ol>
              <li v-for="activity in store.selectedEventActivities" :key="activity.id">
                <i aria-hidden="true"></i>
                <span>
                  <b>{{ activity.description }}</b>
                  <small>{{ formatActivityTime(activity.occurredAt) }}</small>
                </span>
              </li>
            </ol>
          </section>
        </template>
        <p v-else-if="!eventFormOpen" class="empty">点击地图点位或左侧事件查看详情</p>
        <section v-if="!eventFormOpen" class="region-manager">
          <header>
            <strong>巡检区域</strong>
            <button type="button" :disabled="!canSaveCurrentRegion" @click="saveCurrentRegion">
              保存当前
            </button>
          </header>
          <div v-if="store.regionEventIds !== null" class="region-batch-actions">
            <strong>区域批量处置</strong>
            <span>
              待处理 {{ regionStatusCounts.PENDING }} · 处理中 {{ regionStatusCounts.PROCESSING }}
            </span>
            <button
              type="button"
              :disabled="regionStatusCounts.PENDING === 0"
              @click="batchAdvanceRegionEvents('PENDING')"
            >
              批量开始处理
            </button>
            <button
              type="button"
              :disabled="regionStatusCounts.PROCESSING === 0"
              @click="batchAdvanceRegionEvents('PROCESSING')"
            >
              批量标记完成
            </button>
          </div>
          <p v-if="store.regions.length === 0" class="region-empty">暂无保存区域</p>
          <div
            v-for="region in store.regions"
            :key="region.id"
            class="region-item"
            :class="{ active: region.id === store.activeRegionId }"
          >
            <button type="button" class="region-open" @click="showSavedRegion(region.id)">
              <strong>{{ region.name }}</strong>
              <small>
                {{ region.geometry.type }} ·
                {{ region.eventIds === null ? '未计算' : `${region.eventIds.length} 个事件` }}
              </small>
            </button>
            <button
              type="button"
              class="region-delete"
              :aria-label="`删除${region.name}`"
              @click="removeSavedRegion(region.id)"
            >
              ×
            </button>
          </div>
        </section>
      </aside>
    </div>
    <div class="performance-controls">
      <strong>性能测试</strong>
      <span>数据量</span>
      <button
        v-for="count in [1000, 10000, 50000, 100000]"
        :key="count"
        :class="{ active: dataCount === count }"
        @click="changeDataCount(count)"
      >
        {{ count / 1000 }}k
      </button>
      <span>空间交互</span>
      <button :class="{ active: mapMode === 'select' }" @click="changeMapMode('select')">
        Select
      </button>
      <button
        :class="{ active: mapMode === 'draw' && drawType === 'Point' }"
        @click="changeMapMode('draw', 'Point')"
      >
        Point
      </button>
      <button
        :class="{ active: mapMode === 'draw' && drawType === 'Polygon' }"
        @click="changeMapMode('draw', 'Polygon')"
      >
        Polygon
      </button>
      <button
        :class="{ active: mapMode === 'draw' && drawType === 'Circle' }"
        @click="changeMapMode('draw', 'Circle')"
      >
        Circle
      </button>
      <button :class="{ active: mapMode === 'modify' }" @click="changeMapMode('modify')">
        Modify
      </button>
      <span>渲染模式</span>
      <button :class="{ active: renderMode === 'point' }" @click="changeRenderMode('point')">
        普通点位
      </button>
      <button :class="{ active: renderMode === 'cluster' }" @click="changeRenderMode('cluster')">
        Cluster
      </button>
    </div>
    <div class="performance-metrics" aria-label="最近一次数据更新性能指标">
      <strong>最近一次更新</strong>
      <span>
        数据生成
        <b>{{ formatDuration(dataGenerationMs) }}</b>
      </span>
      <span>
        Feature 转换
        <b>{{ formatDuration(stats.featureConversionMs) }}</b>
      </span>
      <span>
        Source 更新
        <b>{{ formatDuration(stats.sourceUpdateMs) }}</b>
      </span>
      <span>
        渲染完成
        <b>
          {{
            stats.renderCompleteMs === null ? '等待渲染' : formatDuration(stats.renderCompleteMs)
          }}
        </b>
      </span>
    </div>
    <div class="track-controls">
      <strong>轨迹回放</strong>
      <button @click="mapManager?.playTrack()">播放</button>
      <button @click="mapManager?.pauseTrack()">暂停</button>
      <button @click="mapManager?.resetTrack()">重置</button>
      <button :class="{ active: trackSpeed === 1 }" @click="changeTrackSpeed(1)">1x</button>
      <button :class="{ active: trackSpeed === 2 }" @click="changeTrackSpeed(2)">2x</button>
      <button :class="{ active: trackSpeed === 8 }" @click="changeTrackSpeed(8)">8x</button>
      <span>当前巡检时间：{{ formattedTrackTime }}</span>
      <span>状态：{{ trackStatus }}</span>
    </div>
    <footer class="gis-status">
      <span>数据量：{{ store.events.length.toLocaleString() }}</span>
      <span>筛选结果：{{ store.filteredEvents.length.toLocaleString() }}</span>
      <span>渲染模式：{{ renderMode === 'cluster' ? 'Cluster' : '普通点位' }}</span>
      <span>Zoom：{{ stats.zoom }}</span>
      <span>经纬度：{{ formattedPointerCoordinate }}</span>
      <span>当前 Feature：{{ stats.featureCount.toLocaleString() }}</span>
      <span>框选事件：{{ (store.regionEventIds?.length ?? 0).toLocaleString() }}</span>
    </footer>
  </section>
</template>

<style scoped>
.gis-shell {
  min-height: 730px;
  background: #08101f;
  color: #dbeafe;
  border: 1px solid #20314c;
  border-radius: 12px;
  overflow: hidden;
}
.gis-header {
  height: 70px;
  padding: 0 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0d1729;
  border-bottom: 1px solid #20314c;
}
.gis-header h2 {
  font-size: 20px;
  margin: 3px 0 0;
}
.gis-header small {
  color: #38bdf8;
  letter-spacing: 0.12em;
}
.online {
  color: #34d399;
  font-size: 13px;
}
.gis-workspace {
  display: grid;
  grid-template-columns: 250px minmax(360px, 1fr) 260px;
  height: 560px;
}
.event-list,
.event-detail {
  background: #0b1424;
  overflow: auto;
}
.event-list {
  border-right: 1px solid #20314c;
}
.event-detail {
  border-left: 1px solid #20314c;
}
.event-list header,
.event-detail header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #20314c;
}
.event-list header span {
  color: #64748b;
}
.event-list > button {
  width: 100%;
  display: grid;
  grid-template-columns: 10px 1fr auto;
  gap: 10px;
  align-items: center;
  text-align: left;
  padding: 14px;
  border: 0;
  border-bottom: 1px solid #15243a;
  background: transparent;
  color: #dbeafe;
  cursor: pointer;
}
.event-list > button:hover,
.event-list > button.active {
  background: #13243d;
}
.event-list > button small {
  display: block;
  color: #71809a;
  margin-top: 5px;
}
.event-list-main {
  min-width: 0;
}
.event-list-title {
  display: flex;
  gap: 6px;
  align-items: center;
}
.event-list-title b {
  padding: 1px 4px;
  color: #94a3b8;
  border: 1px solid #334155;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 500;
}
.event-list-id {
  overflow: hidden;
  color: #64748b !important;
  font-family: monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event-list-side {
  display: grid;
  justify-items: end;
  gap: 6px;
  white-space: nowrap;
}
.event-list-side time {
  color: #64748b;
  font-size: 9px;
}
.event-list em {
  font-style: normal;
  font-size: 11px;
  color: #7dd3fc;
}
.event-filters {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid #20314c;
  background: #0d1729;
}
.event-filters input,
.event-filters select {
  width: 100%;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  color: #dbeafe;
  background: #111e32;
  border: 1px solid #2a3d5c;
  border-radius: 5px;
  font-size: 11px;
}
.event-filters input:focus,
.event-filters select:focus {
  border-color: #38bdf8;
  outline: none;
}
.filter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.filter-grid select:last-child {
  grid-column: 1 / -1;
}
.filter-actions {
  display: flex;
  gap: 6px;
}
.filter-actions button {
  flex: 1;
  padding: 6px 8px;
  color: #94a3b8;
  background: #111e32;
  border: 1px solid #2a3d5c;
  border-radius: 5px;
  cursor: pointer;
}
.filter-actions button:first-child {
  color: #7dd3fc;
  border-color: #38bdf8;
  background: #0c2d46;
}
.event-sort {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: center;
  color: #71809a;
  font-size: 10px;
}
.event-export {
  padding: 7px 8px;
  color: #a7f3d0;
  background: #064e3b66;
  border: 1px solid #10b981;
  border-radius: 5px;
  cursor: pointer;
}
.event-fit {
  padding: 7px 8px;
  color: #fde68a;
  background: #78350f66;
  border: 1px solid #f59e0b;
  border-radius: 5px;
  cursor: pointer;
}
.event-export:disabled,
.event-fit:disabled {
  color: #475569;
  background: #111827;
  border-color: #334155;
  cursor: not-allowed;
}
.event-import {
  position: relative;
  padding: 7px 8px;
  color: #bae6fd;
  background: #0c4a6e66;
  border: 1px solid #0ea5e9;
  border-radius: 5px;
  text-align: center;
  cursor: pointer;
}
.event-import input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
}
.import-feedback {
  margin: 0;
  color: #86efac;
  font-size: 10px;
}
.import-feedback.error {
  color: #fca5a5;
}
.status-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 8px;
  color: #71809a;
  font-size: 10px;
}
.status-summary span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.status-summary i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.filter-empty {
  margin: 0;
  padding: 24px 12px;
  color: #71809a;
  text-align: center;
  font-size: 12px;
}
.event-pagination {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: 30px 30px 1fr 30px 30px;
  gap: 6px;
  align-items: center;
  padding: 8px 10px;
  color: #94a3b8;
  background: #0d1729f2;
  border-bottom: 1px solid #20314c;
  font-size: 10px;
  text-align: center;
  backdrop-filter: blur(6px);
}
.event-pagination-summary {
  grid-column: 1 / -1;
}
.event-pagination button {
  height: 26px;
  color: #7dd3fc;
  background: #0c2d46;
  border: 1px solid #2a3d5c;
  border-radius: 5px;
  cursor: pointer;
}
.event-page-jump {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px;
}
.event-page-jump input {
  box-sizing: border-box;
  min-width: 0;
  height: 26px;
  padding: 0 4px;
  color: #dbeafe;
  background: #111e32;
  border: 1px solid #2a3d5c;
  border-radius: 5px;
  font-size: 10px;
  text-align: center;
}
.event-page-jump button {
  width: auto;
  padding: 0 6px;
  font-size: 10px;
}
.event-pagination button:disabled {
  color: #475569;
  background: #111827;
  cursor: not-allowed;
}
.level {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}
.map-panel {
  position: relative;
  min-width: 0;
}
.map-canvas {
  width: 100%;
  height: 100%;
  background: #dbe4ec;
}
.map-canvas :deep(.ol-scale-line) {
  right: 10px;
  bottom: 10px;
  left: auto;
  padding: 3px 6px;
  background: #08101fd9;
  border: 1px solid #334155;
  border-radius: 5px;
}
.map-canvas :deep(.ol-scale-line-inner) {
  color: #dbeafe;
  border-color: #dbeafe;
  border-top: 0;
  font-size: 10px;
}
.map-legend {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  display: grid;
  gap: 8px;
  min-width: 210px;
  padding: 10px 12px;
  color: #dbeafe;
  background: #08101fe6;
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 6px 18px #02061752;
  font-size: 11px;
  pointer-events: none;
}
.map-legend strong {
  font-size: 12px;
}
.layer-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 7px 12px;
  padding: 10px 12px;
  color: #dbeafe;
  background: #08101fe6;
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 6px 18px #02061752;
  font-size: 11px;
}
.layer-panel strong {
  grid-column: 1 / -1;
  font-size: 12px;
}
.layer-panel label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
.layer-panel input {
  margin: 0;
  accent-color: #38bdf8;
}
.legend-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend-title {
  width: 48px;
  color: #94a3b8;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.legend-level,
.legend-status {
  --legend-color: #94a3b8;
  display: inline-block;
  box-sizing: border-box;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.legend-level {
  background: var(--legend-color);
  border: 1px solid #ffffff;
}
.legend-status {
  border: 2px solid var(--legend-color);
}
.legend-selection {
  width: 12px;
  height: 12px;
  border-width: 3px;
}
.map-popup {
  display: none;
  min-width: 180px;
  padding: 10px 12px;
  background: #0b1424;
  border: 1px solid #38bdf8;
  border-radius: 8px;
  box-shadow: 0 8px 24px #02061780;
}
.map-popup.visible {
  display: grid;
  gap: 4px;
}
.map-popup span {
  font-size: 11px;
  color: #94a3b8;
}
.detail-id {
  margin: 18px 16px;
  padding: 12px;
  background: #13243d;
  border-radius: 8px;
  color: #38bdf8;
  font-family: monospace;
}
.event-detail dl {
  margin: 0;
  padding: 0 16px;
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 14px 8px;
  font-size: 13px;
}
.event-detail dt {
  color: #71809a;
}
.event-detail dd {
  margin: 0;
}
.detail-create {
  padding: 4px 9px;
  color: #7dd3fc;
  background: #0c2d46;
  border: 1px solid #38bdf8;
  border-radius: 5px;
  cursor: pointer;
}
.event-editor {
  display: grid;
  gap: 12px;
  padding: 16px;
}
.event-editor label {
  display: grid;
  gap: 5px;
  color: #71809a;
  font-size: 11px;
}
.event-editor input,
.event-editor select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  color: #dbeafe;
  background: #111e32;
  border: 1px solid #2a3d5c;
  border-radius: 5px;
}
.coordinate-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.map-location-picker {
  padding: 9px 10px;
  color: #7dd3fc;
  background: #0c2d46;
  border: 1px solid #38bdf8;
  border-radius: 5px;
  cursor: crosshair;
}
.map-location-picker.active {
  color: #fef3c7;
  background: #78350f;
  border-color: #f59e0b;
}
.event-editor-error {
  margin: 0;
  color: #fca5a5;
  font-size: 11px;
}
.event-editor-actions {
  display: flex;
  gap: 8px;
}
.event-editor-actions button,
.event-edit {
  flex: 1;
  padding: 8px 10px;
  color: #94a3b8;
  background: #111e32;
  border: 1px solid #2a3d5c;
  border-radius: 5px;
  cursor: pointer;
}
.event-editor-actions button:last-child {
  color: #e0f2fe;
  background: #075985;
  border-color: #38bdf8;
}
.event-detail-actions {
  display: flex;
  gap: 8px;
  margin: 18px 16px 0;
  padding-top: 14px;
  border-top: 1px solid #20314c;
}
.event-delete {
  flex: 1;
  padding: 8px 10px;
  color: #fca5a5;
  background: #450a0a66;
  border: 1px solid #991b1b;
  border-radius: 5px;
  cursor: pointer;
}
.delete-confirmation {
  display: grid;
  gap: 8px;
  margin: 10px 16px 0;
  padding: 10px;
  color: #fecaca;
  background: #450a0a80;
  border: 1px solid #991b1b;
  border-radius: 6px;
  font-size: 11px;
}
.delete-confirmation span {
  color: #fca5a5;
}
.delete-confirmation div {
  display: flex;
  gap: 8px;
}
.delete-confirmation button {
  flex: 1;
  padding: 6px;
  color: #cbd5e1;
  background: #111827;
  border: 1px solid #334155;
  border-radius: 4px;
  cursor: pointer;
}
.delete-confirmation button:last-child {
  color: #fee2e2;
  background: #7f1d1d;
  border-color: #ef4444;
}
.event-timeline {
  margin: 20px 16px 0;
  padding-top: 16px;
  border-top: 1px solid #20314c;
}
.event-timeline > strong {
  font-size: 12px;
}
.event-timeline ol {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.event-timeline li {
  position: relative;
  display: grid;
  grid-template-columns: 10px 1fr;
  gap: 8px;
  min-height: 42px;
}
.event-timeline li:not(:last-child)::after {
  position: absolute;
  top: 12px;
  bottom: 0;
  left: 4px;
  width: 1px;
  background: #2a3d5c;
  content: '';
}
.event-timeline i {
  position: relative;
  z-index: 1;
  width: 8px;
  height: 8px;
  margin-top: 3px;
  background: #38bdf8;
  border: 1px solid #0b1424;
  border-radius: 50%;
}
.event-timeline span {
  display: grid;
  align-content: start;
  gap: 4px;
}
.event-timeline b {
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 500;
}
.event-timeline small {
  color: #64748b;
  font-size: 10px;
}
.status-action {
  width: calc(100% - 32px);
  margin: 22px 16px 0;
  padding: 9px 12px;
  color: #e0f2fe;
  background: #075985;
  border: 1px solid #38bdf8;
  border-radius: 6px;
  cursor: pointer;
}
.status-action:hover {
  background: #0369a1;
}
.status-finished {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 22px 16px 0;
  padding: 8px 10px;
  color: #86efac;
  background: #14532d33;
  border-left: 3px solid #22c55e;
  border-radius: 0 4px 4px 0;
}
.status-finished i {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 0 4px #22c55e1f;
}
.status-finished span {
  display: grid;
  gap: 2px;
}
.status-finished small {
  color: #6ee7b7;
  font-size: 10px;
}
.status-finished strong {
  font-size: 12px;
}
.region-manager {
  margin-top: 22px;
  border-top: 1px solid #20314c;
}
.region-manager header {
  align-items: center;
}
.region-manager header button {
  padding: 5px 8px;
  color: #7dd3fc;
  background: #0c2d46;
  border: 1px solid #38bdf8;
  border-radius: 5px;
  cursor: pointer;
}
.region-manager header button:disabled {
  color: #475569;
  background: #111827;
  border-color: #334155;
  cursor: not-allowed;
}
.region-batch-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin: 10px;
  padding: 10px;
  background: #111e32;
  border: 1px solid #2a3d5c;
  border-radius: 6px;
}
.region-batch-actions strong,
.region-batch-actions span {
  grid-column: 1 / -1;
}
.region-batch-actions strong {
  font-size: 11px;
}
.region-batch-actions span {
  color: #71809a;
  font-size: 10px;
}
.region-batch-actions button {
  padding: 7px 5px;
  color: #7dd3fc;
  background: #0c2d46;
  border: 1px solid #38bdf8;
  border-radius: 5px;
  cursor: pointer;
}
.region-batch-actions button:disabled {
  color: #475569;
  background: #111827;
  border-color: #334155;
  cursor: not-allowed;
}
.region-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 30px;
  margin: 8px 10px;
  border: 1px solid #20314c;
  border-radius: 6px;
  overflow: hidden;
}
.region-item.active {
  border-color: #38bdf8;
  background: #0c2d463d;
}
.region-open,
.region-delete {
  border: 0;
  color: #cbd5e1;
  background: transparent;
  cursor: pointer;
}
.region-open {
  min-width: 0;
  padding: 9px;
  text-align: left;
}
.region-open strong,
.region-open small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.region-open small {
  margin-top: 4px;
  color: #71809a;
  font-size: 10px;
}
.region-delete {
  color: #94a3b8;
  border-left: 1px solid #20314c;
  font-size: 18px;
}
.region-delete:hover {
  color: #fca5a5;
  background: #7f1d1d3d;
}
.region-empty {
  padding: 16px;
  color: #71809a;
  text-align: center;
  font-size: 12px;
}
.empty {
  padding: 28px 18px;
  color: #71809a;
  line-height: 1.7;
}
.gis-status {
  height: 48px;
  display: flex;
  gap: 28px;
  align-items: center;
  padding: 0 18px;
  border-top: 1px solid #20314c;
  color: #8ba0bd;
  font-size: 12px;
}
.performance-controls {
  min-height: 52px;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 0 16px;
  border-top: 1px solid #20314c;
  background: #0d1729;
  font-size: 12px;
}
.track-controls {
  min-height: 46px;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 0 16px;
  border-top: 1px solid #20314c;
  background: #0a1322;
  font-size: 12px;
}
.performance-metrics {
  min-height: 42px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
  align-items: center;
  padding: 0 16px;
  border-top: 1px solid #20314c;
  background: #0b1628;
  color: #71809a;
  font-size: 12px;
}
.performance-metrics strong {
  color: #dbeafe;
}
.performance-metrics span {
  display: inline-flex;
  gap: 6px;
}
.performance-metrics b {
  color: #67e8f9;
  font-variant-numeric: tabular-nums;
}
.performance-controls span,
.track-controls span {
  margin-left: 12px;
  color: #71809a;
}
.performance-controls button,
.track-controls button {
  padding: 6px 10px;
  border: 1px solid #2a3d5c;
  border-radius: 5px;
  background: #111e32;
  color: #94a3b8;
  cursor: pointer;
}
.performance-controls button.active,
.track-controls button.active {
  border-color: #38bdf8;
  color: #7dd3fc;
  background: #0c2d46;
}
@media (max-width: 1000px) {
  .gis-workspace {
    grid-template-columns: 210px 1fr;
  }
  .event-detail {
    display: none;
  }
}
@media (max-width: 720px) {
  .gis-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: 210px 1fr;
  }
  .event-list {
    border-right: 0;
    border-bottom: 1px solid #20314c;
  }
  .gis-header h2 {
    font-size: 16px;
  }
}
</style>
