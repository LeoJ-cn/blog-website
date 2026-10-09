<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
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
import { useGisStore } from '../stores/gis'
import type { EventLevel, EventStatus, EventType } from '../types/inspection-event'
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
const store = useGisStore()
const selectedEvent = computed(() => store.selectedEvent)
const statusActionLabel = computed(() => {
  if (selectedEvent.value?.status === 'PENDING') return '开始处理'
  if (selectedEvent.value?.status === 'PROCESSING') return '标记完成'
  return null
})
const canSaveCurrentRegion = computed(
  () => store.regionEventIds !== null && store.activeRegionId === null,
)
const visibleEvents = computed(() => {
  // 地图只显示已应用筛选的数据；列表仍限制 100 行，避免 Vue DOM 成为性能瓶颈。
  if (store.regionEventIds === null) return store.filteredEvents.slice(0, 100)
  const selectedIds = new Set(store.regionEventIds)
  return store.filteredEvents.filter((event) => selectedIds.has(event.id)).slice(0, 100)
})
const statusCounts = computed(() => {
  const counts: Record<EventStatus, number> = { PENDING: 0, PROCESSING: 0, DONE: 0 }
  for (const event of store.events) counts[event.status] += 1
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

/** 性能面板统一保留一位小数，低于计时器分辨率的耗时仍显示为 0.0 ms。 */
function formatDuration(durationMs: number): string {
  return `${durationMs.toFixed(1)} ms`
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

function changeDataCount(count: number) {
  // 数据生成与 Feature 替换由用户主动触发，避免响应式深层监听反复重建地图对象。
  dataCount.value = count
  const events = generateEvents(count)
  store.setEvents(events)
  store.selectEvent(null)
  store.selectRegionEvents(null)
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
  syncVisibleEvents()
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
    onRegionSelect: (eventIds) => {
      store.selectRegionEvents(eventIds)
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
      <aside class="event-list">
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
          <div class="status-summary" aria-label="事件状态统计">
            <span v-for="status in EVENT_STATUSES" :key="status">
              <i :style="{ backgroundColor: EVENT_STATUS_VISUALS[status].color }"></i>
              {{ EVENT_STATUS_VISUALS[status].label }} {{ statusCounts[status].toLocaleString() }}
            </span>
          </div>
        </form>
        <p v-if="visibleEvents.length === 0" class="filter-empty">当前条件下没有巡检事件</p>
        <button
          v-for="event in visibleEvents"
          :key="event.id"
          :class="{ active: event.id === store.selectedEventId }"
          @click="selectFromList(event.id)"
        >
          <span
            class="level"
            :style="{ backgroundColor: EVENT_STATUS_VISUALS[event.status].color }"
          ></span>
          <span>
            <strong>{{ TYPE_LABELS[event.type] }}</strong>
            <small>{{ event.address }}</small>
          </span>
          <em :style="{ color: EVENT_STATUS_VISUALS[event.status].color }">
            {{ EVENT_STATUS_VISUALS[event.status].label }}
          </em>
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
        <header><strong>事件详情</strong></header>
        <template v-if="selectedEvent">
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
          <p v-else class="status-finished">该事件已完成处置</p>
        </template>
        <p v-else class="empty">点击地图点位或左侧事件查看详情</p>
        <section class="region-manager">
          <header>
            <strong>巡检区域</strong>
            <button type="button" :disabled="!canSaveCurrentRegion" @click="saveCurrentRegion">
              保存当前
            </button>
          </header>
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
  margin: 22px 16px 0;
  padding: 9px 12px;
  color: #86efac;
  background: #14532d4d;
  border: 1px solid #22c55e66;
  border-radius: 6px;
  text-align: center;
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
