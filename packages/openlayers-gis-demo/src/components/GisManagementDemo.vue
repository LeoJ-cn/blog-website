<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import 'ol/ol.css'
import { MapManager } from '../map/MapManager'
import type { MapStats, RenderMode } from '../map/MapManager'
import type { DrawGeometryType, MapMode } from '../map/interactions/SpatialInteractionManager'
import { generateInspectionEvents } from '../mock/generate-events'
import { mockInspectionTrack } from '../mock/tracks'
import { useGisStore } from '../stores/gis'
import type { TrackPlaybackStatus } from '../types/track'

const TYPE_LABELS = {
  ROAD_DAMAGE: '道路破损',
  LIGHT_FAILURE: '路灯故障',
  GARBAGE: '垃圾堆积',
  MANHOLE: '井盖异常',
} as const
const STATUS_LABELS = { PENDING: '待处理', PROCESSING: '处理中', DONE: '已完成' } as const
const LEVEL_LABELS = { HIGH: '高', MEDIUM: '中', LOW: '低' } as const

const mapTarget = ref<HTMLElement | null>(null)
const popupElement = ref<HTMLElement | null>(null)
const store = useGisStore()
const selectedEvent = computed(() => store.selectedEvent)
const visibleEvents = computed(() => {
  // 地图保留完整数据；列表最多渲染 100 行，避免 Vue DOM 成为十万点场景的性能瓶颈。
  if (store.regionEventIds === null) return store.events.slice(0, 100)
  const selectedIds = new Set(store.regionEventIds)
  return store.events.filter((event) => selectedIds.has(event.id)).slice(0, 100)
})
const dataCount = ref(10_000)
const renderMode = ref<RenderMode>('cluster')
const stats = ref<MapStats>({ zoom: 12, featureCount: 0, renderMode: 'cluster' })
const mapMode = ref<MapMode>('select')
const drawType = ref<DrawGeometryType>('Polygon')
const trackSpeed = ref<1 | 2>(1)
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

function selectFromList(eventId: string) {
  if (renderMode.value === 'cluster') changeRenderMode('point')
  store.selectEvent(eventId)
  mapManager?.focusEvent(eventId)
}

function changeDataCount(count: number) {
  // 数据生成与 Feature 替换由用户主动触发，避免响应式深层监听反复重建地图对象。
  dataCount.value = count
  const events = generateInspectionEvents(count)
  store.setEvents(events)
  store.selectEvent(null)
  store.selectRegionEvents(null)
  mapManager?.setEvents(events)
}

function changeMapMode(mode: MapMode, geometryType: DrawGeometryType = drawType.value) {
  mapMode.value = mode
  drawType.value = geometryType
  if (mode === 'select' && renderMode.value === 'cluster') changeRenderMode('point')
  mapManager?.setInteractionMode(mode, geometryType)
}

function changeRenderMode(mode: RenderMode) {
  renderMode.value = mode
  store.selectEvent(null)
  mapManager?.setRenderMode(mode)
}

function changeTrackSpeed(speed: 1 | 2) {
  trackSpeed.value = speed
  mapManager?.setTrackSpeed(speed)
}

onMounted(() => {
  const events = generateInspectionEvents(dataCount.value)
  store.setEvents(events)
  mapManager = new MapManager({
    events,
    onEventSelect: store.selectEvent,
    onStatsChange: (nextStats) => {
      stats.value = nextStats
    },
    onRegionSelect: store.selectRegionEvents,
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
                : `${store.events.length} 条`
            }}
          </span>
        </header>
        <button
          v-for="event in visibleEvents"
          :key="event.id"
          :class="{ active: event.id === store.selectedEventId }"
          @click="selectFromList(event.id)"
        >
          <span class="level" :data-level="event.level"></span>
          <span>
            <strong>{{ TYPE_LABELS[event.type] }}</strong>
            <small>{{ event.address }}</small>
          </span>
          <em>{{ STATUS_LABELS[event.status] }}</em>
        </button>
      </aside>
      <main class="map-panel">
        <div ref="mapTarget" class="map-canvas"></div>
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
            <dd>{{ STATUS_LABELS[selectedEvent.status] }}</dd>
            <dt>紧急程度</dt>
            <dd>{{ LEVEL_LABELS[selectedEvent.level] }}</dd>
            <dt>上报位置</dt>
            <dd>{{ selectedEvent.address }}</dd>
            <dt>上报时间</dt>
            <dd>{{ selectedEvent.createdAt }}</dd>
          </dl>
        </template>
        <p v-else class="empty">点击地图点位或左侧事件查看详情</p>
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
    <div class="track-controls">
      <strong>轨迹回放</strong>
      <button @click="mapManager?.playTrack()">播放</button>
      <button @click="mapManager?.pauseTrack()">暂停</button>
      <button @click="mapManager?.resetTrack()">重置</button>
      <button :class="{ active: trackSpeed === 1 }" @click="changeTrackSpeed(1)">1x</button>
      <button :class="{ active: trackSpeed === 2 }" @click="changeTrackSpeed(2)">2x</button>
      <span>当前巡检时间：{{ formattedTrackTime }}</span>
      <span>状态：{{ trackStatus }}</span>
    </div>
    <footer class="gis-status">
      <span>数据量：{{ store.events.length.toLocaleString() }}</span>
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
.event-list button {
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
.event-list button:hover,
.event-list button.active {
  background: #13243d;
}
.event-list button small {
  display: block;
  color: #71809a;
  margin-top: 5px;
}
.event-list em {
  font-style: normal;
  font-size: 11px;
  color: #7dd3fc;
}
.level {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}
.level[data-level='HIGH'] {
  background: #ef4444;
}
.level[data-level='MEDIUM'] {
  background: #f59e0b;
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
