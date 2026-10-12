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
import { mockInspectionTrack } from '../mock/tracks'
import {
  parseInspectionEventsGeoJson,
  serializeInspectionEventsToGeoJson,
} from '../services/export-events'
import { useGisStore } from '../stores/gis'
import type {
  EventLevel,
  EventStatus,
  EventType,
  InspectionEvent,
} from '../types/inspection-event'
import type { Wgs84Coordinate } from '../types/region'
import type { TrackPlaybackSpeed, TrackPlaybackStatus, TrackPoint } from '../types/track'
import { createMockViewportEventService } from '../viewport/mock-viewport-event-service'
import { ViewportQueryController } from '../viewport/viewport-query-controller'
import { mergeViewportQueryState, resetViewportDatasetState } from '../viewport/viewport-state'
import type {
  ViewportDatasetBuildStats,
  ViewportEventService,
  ViewportQueryState,
  Wgs84Bbox,
} from '../viewport/types'

interface Props {
  /** 由宿主配置层注入的天地图浏览器端 Token；组件不会记录或展示其内容。 */
  tiandituToken?: string
}

const props = withDefaults(defineProps<Props>(), { tiandituToken: '' })

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
/** 不同调度等级的处置时限，单位为小时；截止时刻按事件上报时间向后累加。 */
const EVENT_SLA_HOURS: Record<EventLevel, number> = { HIGH: 2, MEDIUM: 4, LOW: 8 }
const INSPECTOR_NAMES = ['张建国', '李敏', '王磊', '陈静', '赵强', '周宁'] as const
type WorkspaceScene =
  | 'realtime' // 日常监控事件、轨迹和处置状态。
  | 'dispatch' // 展示责任网格并突出任务分派与区域处置。
  | 'replay' // 隐藏事件点，突出巡检轨迹和时间轴复盘。
const WORKSPACE_SCENE_META: Record<WorkspaceScene, { label: string; description: string }> = {
  realtime: { label: '实时态势', description: '事件聚合、在线轨迹与处置状态' },
  dispatch: { label: '任务调度', description: '责任网格、精确点位与人员分派' },
  replay: { label: '巡检复盘', description: '巡检路线、时间定位与覆盖核查' },
}
const EVENT_CREATED_AT_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
type LayerControlId =
  | 'base'
  | 'events'
  | 'heatmap'
  | 'responsibilityGrid'
  | 'track'
  | 'region'
  | 'selection'
const LAYER_CONTROLS: readonly { id: LayerControlId; label: string }[] = [
  { id: 'base', label: '底图' },
  { id: 'events', label: '事件' },
  { id: 'heatmap', label: '热力' },
  { id: 'responsibilityGrid', label: '网格' },
  { id: 'track', label: '轨迹' },
  { id: 'region', label: '绘制区域' },
  { id: 'selection', label: '选中高亮' },
]
const statusLegend = Object.values(EVENT_STATUS_VISUALS)
const selectionLegendStyle = { '--legend-color': EVENT_SELECTION_COLOR }

type BaseMapStatus =
  | 'ready' // 已配置 Token，底图请求尚未发现失败。
  | 'missing-token' // 宿主未配置 Token；业务图层仍可独立运行。
  | 'load-error' // 天地图拒绝请求或瓦片网络加载失败。
const baseMapStatus = ref<BaseMapStatus>(props.tiandituToken.trim() ? 'ready' : 'missing-token')
const baseMapStatusMessage = computed(() => {
  if (baseMapStatus.value === 'missing-token') {
    return '天地图 Token 未配置，当前仅显示业务图层'
  }
  if (baseMapStatus.value === 'load-error') {
    return '天地图底图加载失败，请检查 Token、域名白名单或网络'
  }
  return ''
})

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

interface EventEvidenceAttachment {
  id: string
  name: string
  /** 浏览器为本地图片创建的临时 Blob URL，组件销毁或附件移除时必须释放。 */
  objectUrl: string
  /** 文件大小，单位为字节。 */
  sizeBytes: number
  /** ISO 8601 格式的本地附件添加时间。 */
  addedAt: string
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
const dispatchAssignee = ref('')
const workspaceScene = ref<WorkspaceScene>('realtime')
const activeSceneMeta = computed(() => WORKSPACE_SCENE_META[workspaceScene.value])
const importFeedback = ref<{ message: string; error: boolean } | null>(null)
const evidenceByEventId = reactive<Record<string, EventEvidenceAttachment[]>>({})
const evidenceFeedback = ref<{ message: string; error: boolean } | null>(null)
const selectedEventEvidence = computed(() => {
  const eventId = store.selectedEventId
  return eventId ? (evidenceByEventId[eventId] ?? []) : []
})
const statusActionLabel = computed(() => {
  if (selectedEvent.value?.status === 'PENDING') return '开始处理'
  if (selectedEvent.value?.status === 'PROCESSING') return '标记完成'
  return null
})
const statusActionBlockReason = computed(() => {
  const event = selectedEvent.value
  if (!event) return null
  if (event.status === 'PENDING' && !store.selectedEventAssignee) {
    return '请先分派责任人，再开始处理'
  }
  if (event.status === 'PROCESSING' && selectedEventEvidence.value.length === 0) {
    return '请至少添加 1 张现场图片，再标记完成'
  }
  return null
})
const canSaveCurrentRegion = computed(
  () => store.regionEventIds !== null && store.activeRegionId === null,
)
const slaView = ref<'ALL' | 'OVERDUE'>('ALL')
/** ALL 表示全部任务，UNASSIGNED 表示尚未分派，其他字符串为巡检人员姓名。 */
const assigneeFilter = ref('ALL')
const operationalFilteredEvents = computed(() =>
  store.filteredEvents.filter((event) => {
    if (
      slaView.value === 'OVERDUE' &&
      (event.status === 'DONE' || getEventSlaRemainingMs(event) >= 0)
    ) {
      return false
    }
    const assignee = store.getEventAssignee(event.id)
    // 人员负载只统计和筛选尚未闭环的当前任务，已完成事件仍可通过顶部闭环率入口查看。
    if (assigneeFilter.value !== 'ALL' && event.status === 'DONE') return false
    if (assigneeFilter.value === 'UNASSIGNED') return assignee === null
    if (assigneeFilter.value !== 'ALL') return assignee === assigneeFilter.value
    return true
  }),
)
const assigneeWorkloads = computed(() => {
  const counts = Object.fromEntries(INSPECTOR_NAMES.map((name) => [name, 0])) as Record<string, number>
  let unassigned = 0
  let total = 0
  for (const event of store.events) {
    if (event.status === 'DONE') continue
    total += 1
    const assignee = store.getEventAssignee(event.id)
    if (assignee) counts[assignee] = (counts[assignee] ?? 0) + 1
    else unassigned += 1
  }
  return { counts, unassigned, total }
})
const scopedEvents = computed(() => {
  const slaFilteredEvents = operationalFilteredEvents.value
  if (store.regionEventIds === null) return slaFilteredEvents
  const selectedIds = new Set(store.regionEventIds)
  return slaFilteredEvents.filter((event) => selectedIds.has(event.id))
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
// 地图和导出使用当前视口结果；列表只渲染当前页，继续限制 DOM 节点数量。
const visibleEvents = computed(() => {
  const start = (eventListPage.value - 1) * EVENT_LIST_PAGE_SIZE
  return sortedScopedEvents.value.slice(start, start + EVENT_LIST_PAGE_SIZE)
})
const statusCounts = computed(() => {
  const counts: Record<EventStatus, number> = { PENDING: 0, PROCESSING: 0, DONE: 0 }
  for (const event of store.events) counts[event.status] += 1
  return counts
})
const demoClock = computed(() => {
  let latestTimestamp = 0
  for (const event of store.events) {
    latestTimestamp = Math.max(latestTimestamp, Date.parse(event.createdAt) || 0)
  }
  // 演示时钟固定在最新上报事件一小时后，使 SLA 结果可复现且不受用户当前日期影响。
  return latestTimestamp + 60 * 60 * 1000
})
const overdueCount = computed(
  () =>
    store.events.filter(
      (event) => event.status !== 'DONE' && getEventSlaRemainingMs(event) < 0,
    ).length,
)
const todayNewCount = computed(() => {
  const latestDate = new Date(demoClock.value).toISOString().slice(0, 10)
  return store.events.filter((event) => event.createdAt.slice(0, 10) === latestDate).length
})
const completionRate = computed(() => {
  if (store.events.length === 0) return 0
  return Math.round((statusCounts.value.DONE / store.events.length) * 100)
})
const onlinePersonnelCount = computed(() =>
  Math.min(210, Math.max(12, Math.round(store.events.length / 48))),
)
const selectedEventSla = computed(() =>
  selectedEvent.value ? getEventSlaPresentation(selectedEvent.value) : null,
)
const dispositionStages = computed(() => {
  const status = selectedEvent.value?.status
  return [
    { label: '事件上报', state: 'done' },
    { label: '派发任务', state: status === 'PENDING' ? 'active' : 'done' },
    {
      label: '现场处理',
      state: status === 'PENDING' ? 'waiting' : status === 'PROCESSING' ? 'active' : 'done',
    },
    { label: '处理反馈', state: status === 'DONE' ? 'done' : 'waiting' },
    { label: '审核结案', state: status === 'DONE' ? 'active' : 'waiting' },
  ] as const
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
const situationOverview = computed(() => {
  const typeCounts = Object.fromEntries(EVENT_TYPES.map((type) => [type, 0])) as Record<
    EventType,
    number
  >
  const levelCounts = Object.fromEntries(EVENT_LEVELS.map((level) => [level, 0])) as Record<
    EventLevel,
    number
  >
  let openCount = 0
  let overdueOpenCount = 0
  for (const event of scopedEvents.value) {
    typeCounts[event.type] += 1
    levelCounts[event.level] += 1
    if (event.status === 'DONE') continue
    openCount += 1
    if (getEventSlaRemainingMs(event) < 0) overdueOpenCount += 1
  }
  const total = scopedEvents.value.length
  const maximumTypeCount = Math.max(1, ...Object.values(typeCounts))
  return {
    total,
    openCount,
    overdueOpenCount,
    healthyOpenCount: Math.max(0, openCount - overdueOpenCount),
    typeRows: EVENT_TYPES.map((type) => ({
      type,
      label: TYPE_LABELS[type],
      count: typeCounts[type],
      // 百分比仅用于条形图宽度，闭区间为 [0, 100]，按当前结果中的最大类型归一化。
      widthPercent: Math.round((typeCounts[type] / maximumTypeCount) * 100),
    })).sort((left, right) => right.count - left.count),
    levelRows: EVENT_LEVELS.map((level) => ({
      level,
      label: LEVEL_LABELS[level],
      count: levelCounts[level],
      ratio: total === 0 ? 0 : Math.round((levelCounts[level] / total) * 100),
    })),
  }
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
  heatmap: false,
  responsibilityGrid: false,
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
  eventSourceDiff: null,
})
const pointerCoordinate = ref<Wgs84Coordinate | null>(null)
const formattedPointerCoordinate = computed(() => {
  const coordinate = pointerCoordinate.value
  return coordinate ? `${coordinate[0].toFixed(6)}, ${coordinate[1].toFixed(6)}` : '—'
})
const datasetBuildStats = ref<ViewportDatasetBuildStats | null>(null)
const viewportQueryState = ref<ViewportQueryState>({
  status: 'idle',
  result: null,
  errorMessage: null,
  requestId: 0,
})
/** 最近一次由地图产生的真实 WGS84 BBOX；null 表示地图尚未形成有效尺寸。 */
const currentViewportBbox = ref<Wgs84Bbox | null>(null)
const mapMode = ref<MapMode>('select')
const drawType = ref<DrawGeometryType>('Polygon')
const trackSpeed = ref<TrackPlaybackSpeed>(1)
const trackStatus = ref<TrackPlaybackStatus>('idle')
const trackTime = ref(mockInspectionTrack[0]?.timestamp ?? 0)
let pendingTrackSeekRatio: number | null = null
let trackSeekFrameId: number | null = null
const formattedTrackTime = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(trackTime.value),
)
const trackProgressPercent = computed(() => {
  const start = mockInspectionTrack[0]?.timestamp ?? 0
  const end = mockInspectionTrack.at(-1)?.timestamp ?? start
  if (end <= start) return 0
  return Math.min(100, Math.max(0, ((trackTime.value - start) / (end - start)) * 100))
})
const trackTotalDurationMs = computed(() => {
  const start = mockInspectionTrack[0]?.timestamp ?? 0
  const end = mockInspectionTrack.at(-1)?.timestamp ?? start
  return Math.max(0, end - start)
})
const trackElapsedMs = computed(() => {
  const start = mockInspectionTrack[0]?.timestamp ?? 0
  return Math.min(trackTotalDurationMs.value, Math.max(0, trackTime.value - start))
})
const trackActiveGridSequence = computed(() => {
  let activeSequence = 0
  for (let index = 0; index < mockInspectionTrack.length; index += 1) {
    if (trackTime.value < mockInspectionTrack[index]!.timestamp) break
    activeSequence = index
  }
  // 零基序号对应蛇形轨迹采样点，也对应责任网格的 gridSequence。
  return activeSequence
})
const trackCoveredGridCount = computed(() =>
  Math.min(mockInspectionTrack.length, trackActiveGridSequence.value + 1),
)
const trackActiveGridLabel = computed(() => {
  return formatTrackGridLabel(trackActiveGridSequence.value)
})
const trackTotalDistanceKm = computed(() => calculateTrackDistanceKm(mockInspectionTrack))
const trackCompletedDistanceKm = computed(() => {
  if (mockInspectionTrack.length < 2) return 0
  let completedKilometers = 0
  for (let index = 0; index < mockInspectionTrack.length - 1; index += 1) {
    const start = mockInspectionTrack[index]!
    const end = mockInspectionTrack[index + 1]!
    if (trackTime.value >= end.timestamp) {
      completedKilometers += calculateSegmentDistanceKm(start, end)
      continue
    }
    if (trackTime.value > start.timestamp) {
      // 当前采样段按时间比例估算已完成距离，比例限制在闭区间 [0, 1]。
      const ratio = Math.min(
        1,
        Math.max(0, (trackTime.value - start.timestamp) / (end.timestamp - start.timestamp)),
      )
      completedKilometers += calculateSegmentDistanceKm(start, end) * ratio
    }
    break
  }
  return completedKilometers
})
let mapManager: MapManager | null = null
let viewportService: ViewportEventService | null = null
let viewportQueryController: ViewportQueryController | null = null

watch([trackActiveGridSequence, workspaceScene], ([activeSequence, scene]) => {
  mapManager?.updateResponsibilityGridProgress(scene === 'replay' ? activeSequence : null)
})

watch(
  () => store.selectedEventId,
  async (eventId) => {
    deleteCandidateId.value = null
    evidenceFeedback.value = null
    dispatchAssignee.value = store.selectedEventAssignee ?? ''
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

/** 使用 Haversine 公式计算相邻 WGS84 坐标的地表距离，返回单位为千米。 */
function calculateSegmentDistanceKm(start: TrackPoint, end: TrackPoint): number {
  const earthRadiusKm = 6371.0088
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(end.lat - start.lat)
  const longitudeDelta = toRadians(end.lng - start.lng)
  const startLatitude = toRadians(start.lat)
  const endLatitude = toRadians(end.lat)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine))
}

function calculateTrackDistanceKm(points: readonly TrackPoint[]): number {
  let distanceKilometers = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    distanceKilometers += calculateSegmentDistanceKm(points[index]!, points[index + 1]!)
  }
  return distanceKilometers
}

function formatTrackDuration(durationMs: number): string {
  const totalSeconds = Math.round(Math.max(0, durationMs) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatTrackGridLabel(sequence: number): string {
  const row = Math.floor(sequence / 4)
  const routeColumn = sequence % 4
  // 奇数行按蛇形路线从东向西行进，转换回网格从西向东的一基列号。
  const column = row % 2 === 0 ? routeColumn : 3 - routeColumn
  return `GRID-${row + 1}-${column + 1}`
}

function formatFileSize(sizeBytes: number): string {
  return sizeBytes >= 1024 * 1024
    ? `${(sizeBytes / 1024 / 1024).toFixed(1)} MiB`
    : `${Math.max(1, Math.round(sizeBytes / 1024))} KiB`
}

function getEventSlaRemainingMs(event: InspectionEvent): number {
  const deadline = Date.parse(event.createdAt) + EVENT_SLA_HOURS[event.level] * 60 * 60 * 1000
  return deadline - demoClock.value
}

function getEventSlaPresentation(event: InspectionEvent) {
  if (event.status === 'DONE') return { label: '已闭环', tone: 'done' as const }
  const remainingMs = getEventSlaRemainingMs(event)
  const totalMinutes = Math.max(1, Math.round(Math.abs(remainingMs) / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const duration = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`
  return remainingMs < 0
    ? { label: `已超时 ${duration}`, tone: 'overdue' as const }
    : { label: `剩余 ${duration}`, tone: 'normal' as const }
}

function assignSelectedEvent() {
  const eventId = store.selectedEventId
  if (!eventId || !dispatchAssignee.value) return
  if (!store.assignEvent(eventId, dispatchAssignee.value)) return
  // 人员筛选开启时，分派可能让事件离开当前结果，必须同步地图 Source 和选择状态。
  if (assigneeFilter.value !== 'ALL') {
    if (!operationalFilteredEvents.value.some((event) => event.id === eventId)) {
      store.selectEvent(null)
    }
    syncVisibleEvents()
  }
}

function changeWorkspaceScene(scene: WorkspaceScene) {
  const restoresAllAssignees = scene !== 'dispatch' && assigneeFilter.value !== 'ALL'
  if (restoresAllAssignees) assigneeFilter.value = 'ALL'
  workspaceScene.value = scene
  const visibilityByScene: Record<WorkspaceScene, Partial<Record<LayerControlId, boolean>>> = {
    realtime: { events: true, heatmap: false, responsibilityGrid: false, track: true },
    dispatch: { events: true, heatmap: false, responsibilityGrid: true, track: false },
    replay: { events: false, heatmap: false, responsibilityGrid: true, track: true },
  }
  for (const [layerId, visible] of Object.entries(visibilityByScene[scene])) {
    const typedLayerId = layerId as LayerControlId
    layerVisibility[typedLayerId] = visible ?? false
    applyLayerVisibility(typedLayerId)
  }
  if (scene === 'realtime') {
    // 实时态势固定恢复海量点聚合和完整轨迹，避免其他场景的精确点选状态泄漏回来。
    changeRenderMode('cluster')
    mapManager?.resetTrack()
  } else if (scene === 'dispatch') {
    changeMapMode('select')
  } else {
    mapManager?.resetTrack()
    mapManager?.fitTrack()
  }
  if (restoresAllAssignees) {
    store.selectEvent(null)
    store.selectRegionEvents(null)
    eventListPage.value = 1
    syncVisibleEvents()
  }
}

function applyAssigneeQuickFilter(assignee: string) {
  assigneeFilter.value = assignee
  store.selectEvent(null)
  store.selectRegionEvents(null)
  eventListPage.value = 1
  syncVisibleEvents()
}

function handleViewportQueryState(nextState: Readonly<ViewportQueryState>) {
  viewportQueryState.value = nextState
  if (
    (nextState.status !== 'success' && nextState.status !== 'empty') ||
    !nextState.result
  ) {
    return
  }

  const merged = mergeViewportQueryState(
    {
      events: store.events,
      selectedEventId: store.selectedEventId,
      regionEventIds: store.regionEventIds,
      page: eventListPage.value,
    },
    nextState,
  )
  store.replaceViewportEvents(merged.events)
  eventListPage.value = merged.page
  mapManager?.syncEvents(operationalFilteredEvents.value)
  // 当前区域几何保留在地图中；新视口事件提交后重新计算区域与视口结果的交集。
  mapManager?.reevaluateCurrentRegion()
  if (mapManager) stats.value = mapManager.getStats()
}

function queryViewport(bbox: Wgs84Bbox) {
  currentViewportBbox.value = bbox
  const expectedDatasetVersion = datasetBuildStats.value?.datasetVersion
  if (!viewportQueryController || expectedDatasetVersion === undefined) return
  void viewportQueryController.query({
    bbox,
    filter: store.eventFilter,
    expectedDatasetVersion,
  })
}

function retryViewportQuery() {
  void viewportQueryController?.retry()
}

function syncVisibleEvents() {
  mapManager?.syncEvents(operationalFilteredEvents.value)
  // 当前区域保留在 RegionSource 中；事件集合变化后必须重新计算包含关系和数量。
  mapManager?.reevaluateCurrentRegion()
  if (mapManager) stats.value = mapManager.getStats()
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
    const remainsVisible = scopedEvents.value.some((event) => event.id === updatedEvent.id)
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
    if (scopedEvents.value.some((event) => event.id === createdEvent.id)) {
      mapManager?.addEvent(createdEvent)
    }
  }

  mapManager?.reevaluateCurrentRegion()
  const isVisible = scopedEvents.value.some((event) => event.id === savedEventId)
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
  releaseEventEvidence(eventId)
  mapManager?.removeEvent(eventId)
  mapManager?.reevaluateCurrentRegion()
  cancelDeleteEvent()
}

function addEventEvidence(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const eventId = store.selectedEventId
  const files = [...(input.files ?? [])]
  input.value = ''
  if (!eventId || files.length === 0) return

  const currentAttachments = evidenceByEventId[eventId] ?? []
  const availableSlots = Math.max(0, 3 - currentAttachments.length)
  if (availableSlots === 0) {
    evidenceFeedback.value = { message: '每个事件最多保留 3 张现场图片', error: true }
    return
  }

  const acceptedAttachments: EventEvidenceAttachment[] = []
  let rejectedCount = 0
  for (const file of files.slice(0, availableSlots)) {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      rejectedCount += 1
      continue
    }
    acceptedAttachments.push({
      id: `${eventId}-evidence-${Date.now()}-${acceptedAttachments.length}`,
      name: file.name,
      objectUrl: URL.createObjectURL(file),
      sizeBytes: file.size,
      addedAt: new Date().toISOString(),
    })
  }
  // 超出剩余槽位的文件也计入跳过数量，反馈用户实际未写入的总数。
  rejectedCount += Math.max(0, files.length - availableSlots)
  if (acceptedAttachments.length > 0) {
    evidenceByEventId[eventId] = [...currentAttachments, ...acceptedAttachments]
  }
  evidenceFeedback.value = {
    message: `已添加 ${acceptedAttachments.length} 张，跳过 ${rejectedCount} 张`,
    error: acceptedAttachments.length === 0,
  }
}

function removeEventEvidence(eventId: string, attachmentId: string) {
  const attachments = evidenceByEventId[eventId] ?? []
  const target = attachments.find((attachment) => attachment.id === attachmentId)
  if (!target) return
  URL.revokeObjectURL(target.objectUrl)
  evidenceByEventId[eventId] = attachments.filter(
    (attachment) => attachment.id !== attachmentId,
  )
  evidenceFeedback.value = null
}

function releaseEventEvidence(eventId: string) {
  for (const attachment of evidenceByEventId[eventId] ?? []) {
    URL.revokeObjectURL(attachment.objectUrl)
  }
  delete evidenceByEventId[eventId]
}

function releaseAllEventEvidence() {
  for (const eventId of Object.keys(evidenceByEventId)) releaseEventEvidence(eventId)
}

function changeDataCount(count: number) {
  if (!viewportService) return
  releaseAllEventEvidence()
  dataCount.value = count
  viewportQueryController?.cancel()
  datasetBuildStats.value = viewportService.setDatasetSize(count)
  const reset = resetViewportDatasetState()
  store.setEvents(reset.events)
  eventListPage.value = reset.page
  // 数据源切换后旧区域几何及其命中结果都不再属于当前数据集，必须整体释放。
  mapManager?.clearRegion()
  mapManager?.setEvents([])
  if (mapManager) stats.value = mapManager.getStats()
  if (currentViewportBbox.value) queryViewport(currentViewportBbox.value)
}

function applyEventFilter() {
  slaView.value = 'ALL'
  store.setEventFilter({
    keyword: filterDraft.keyword,
    type: filterDraft.type || null,
    status: filterDraft.status || null,
    level: filterDraft.level || null,
  })
  eventListPage.value = 1
  if (currentViewportBbox.value) queryViewport(currentViewportBbox.value)
}

function resetEventFilter() {
  slaView.value = 'ALL'
  filterDraft.keyword = ''
  filterDraft.type = ''
  filterDraft.status = ''
  filterDraft.level = ''
  store.resetEventFilter()
  eventListPage.value = 1
  if (currentViewportBbox.value) queryViewport(currentViewportBbox.value)
}

function applyStatusQuickFilter(status: EventStatus | null, overdueOnly = false) {
  filterDraft.status = status ?? ''
  slaView.value = overdueOnly ? 'OVERDUE' : 'ALL'
  store.setEventFilter({
    ...store.eventFilter,
    status,
  })
  eventListPage.value = 1
  if (currentViewportBbox.value) queryViewport(currentViewportBbox.value)
}

function applyOverviewTypeFilter(type: EventType) {
  filterDraft.type = type
  applyEventFilter()
}

function applyOverviewLevelFilter(level: EventLevel) {
  filterDraft.level = level
  applyEventFilter()
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
  link.download = `inspection-viewport-events-${new Date().toISOString().slice(0, 10)}.geojson`
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
  // 单条处置必须满足责任人和现场凭证门禁；批量区域流程保持独立，避免隐式改变其协议。
  if (!eventId || statusActionBlockReason.value) return
  const updatedEvent = store.advanceEventStatus(eventId)
  if (!updatedEvent) return

  const remainsVisible = scopedEvents.value.some((event) => event.id === updatedEvent.id)
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

function seekTrack(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  pendingTrackSeekRatio = Number(input.value) / 100
  if (trackSeekFrameId !== null) return

  // range input 可能在同一绘制帧内连续触发；只提交最新进度，避免地图和 Vue 重复刷新造成闪动。
  trackSeekFrameId = requestAnimationFrame(() => {
    trackSeekFrameId = null
    const progressRatio = pendingTrackSeekRatio
    pendingTrackSeekRatio = null
    if (progressRatio !== null) mapManager?.seekTrack(progressRatio)
  })
}

function seekTrackCheckpoint(sequence: number) {
  const lastSequence = mockInspectionTrack.length - 1
  if (lastSequence <= 0) return
  // 节点序号从 0 开始，除以末节点序号得到闭区间 [0, 1] 的回放进度。
  mapManager?.seekTrack(sequence / lastSequence)
}

onMounted(() => {
  viewportService = createMockViewportEventService(0)
  datasetBuildStats.value = viewportService.setDatasetSize(dataCount.value)
  viewportQueryController = new ViewportQueryController({
    service: viewportService,
    onStateChange: handleViewportQueryState,
  })
  store.setEvents([])
  mapManager = new MapManager({
    tiandituToken: props.tiandituToken,
    onBaseMapError: () => {
      baseMapStatus.value = 'load-error'
    },
    events: [],
    onEventSelect: store.selectEvent,
    onEventSelectInvalidated: () => store.selectEvent(null),
    onViewportChange: queryViewport,
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
  mapManager.updateResponsibilityGridProgress(null)
  if (mapTarget.value) mapManager.mount(mapTarget.value, popupElement.value ?? undefined)
})

onBeforeUnmount(() => {
  if (trackSeekFrameId !== null) cancelAnimationFrame(trackSeekFrameId)
  trackSeekFrameId = null
  pendingTrackSeekRatio = null
  releaseAllEventEvidence()
  viewportQueryController?.destroy()
  viewportQueryController = null
  viewportService?.destroy()
  viewportService = null
  mapManager?.destroy()
  mapManager = null
})
</script>

<template>
  <section class="gis-shell">
    <header class="gis-header">
      <div>
        <small>URBAN INSPECTION CENTER</small>
        <h2>城市巡检运营工作台</h2>
      </div>
      <nav class="gis-primary-nav" aria-label="GIS 工作台导航">
        <button
          type="button"
          :class="{ active: workspaceScene === 'realtime' }"
          @click="changeWorkspaceScene('realtime')"
        >
          实时态势
        </button>
        <button
          type="button"
          :class="{ active: workspaceScene === 'dispatch' }"
          @click="changeWorkspaceScene('dispatch')"
        >
          任务调度
        </button>
        <button
          type="button"
          :class="{ active: workspaceScene === 'replay' }"
          @click="changeWorkspaceScene('replay')"
        >
          巡检复盘
        </button>
      </nav>
      <span class="online">● 系统在线</span>
    </header>
    <section class="operations-summary" aria-label="今日巡检态势">
      <button
        type="button"
        :class="{ active: filterDraft.status === '' && slaView === 'ALL' }"
        @click="applyStatusQuickFilter(null)"
      >
        <span>今日新增</span>
        <strong>{{ todayNewCount.toLocaleString() }}</strong>
        <small>点击查看全部</small>
      </button>
      <button
        class="pending"
        type="button"
        :class="{ active: filterDraft.status === 'PENDING' && slaView === 'ALL' }"
        @click="applyStatusQuickFilter('PENDING')"
      >
        <span>待处置</span>
        <strong>{{ statusCounts.PENDING.toLocaleString() }}</strong>
        <small>点击筛选</small>
      </button>
      <button
        class="processing"
        type="button"
        :class="{ active: filterDraft.status === 'PROCESSING' && slaView === 'ALL' }"
        @click="applyStatusQuickFilter('PROCESSING')"
      >
        <span>处理中</span>
        <strong>{{ statusCounts.PROCESSING.toLocaleString() }}</strong>
        <small>点击筛选</small>
      </button>
      <button
        class="overdue"
        type="button"
        :class="{ active: slaView === 'OVERDUE' }"
        @click="applyStatusQuickFilter(null, true)"
      >
        <span>已超时</span>
        <strong>{{ overdueCount.toLocaleString() }}</strong>
        <small>点击优先处置</small>
      </button>
      <article>
        <span>在线人员</span>
        <strong>{{ onlinePersonnelCount.toLocaleString() }}</strong>
        <small>模拟值守</small>
      </article>
      <button
        class="completed"
        type="button"
        :class="{ active: filterDraft.status === 'DONE' && slaView === 'ALL' }"
        @click="applyStatusQuickFilter('DONE')"
      >
        <span>今日闭环率</span>
        <strong>{{ completionRate }}%</strong>
        <small>点击查看已完成</small>
      </button>
    </section>
    <div class="gis-workspace">
      <aside ref="eventListElement" class="event-list">
        <header>
          <strong>巡检任务</strong>
          <span>
            {{
              store.regionEventIds !== null
                ? `区域内 ${store.regionEventIds.length}`
                : `${scopedEvents.length}/${store.events.length} 条`
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
          <section class="event-tools" aria-label="当前结果数据操作">
            <header>
              <strong>结果工具</strong>
              <small>{{ scopedEvents.length.toLocaleString() }} 条</small>
            </header>
            <div>
              <button
                class="event-fit"
                type="button"
                :disabled="scopedEvents.length === 0"
                aria-label="在地图中定位当前视口筛选结果"
                @click="fitCurrentEvents"
              >
                <i aria-hidden="true">⌖</i><span>定位</span>
              </button>
              <button
                class="event-export"
                type="button"
                :disabled="scopedEvents.length === 0"
                aria-label="将当前视口结果导出为 GeoJSON"
                @click="exportCurrentEvents"
              >
                <i aria-hidden="true">↓</i><span>导出当前视口</span>
              </button>
              <label class="event-import">
                <i aria-hidden="true">↑</i><span>导入</span>
                <input
                  type="file"
                  accept=".geojson,application/geo+json,application/json"
                  aria-label="导入事件 GeoJSON"
                  @change="importGeoJson"
                />
              </label>
            </div>
          </section>
          <p v-if="importFeedback" class="import-feedback" :class="{ error: importFeedback.error }">
            {{ importFeedback.message }}
          </p>
          <div class="status-summary" aria-label="全部事件状态统计">
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
            {{ scopedEvents.length.toLocaleString() }}
            <b>{{ eventListPage }} / {{ eventListPageCount }} 页</b>
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
            <button type="submit" aria-label="跳转到输入页码">GO</button>
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
            <b class="sla-tag" :class="getEventSlaPresentation(event).tone">
              {{ getEventSlaPresentation(event).label }}
            </b>
            <time :datetime="event.createdAt">{{ formatEventCreatedAt(event.createdAt) }}</time>
          </span>
        </button>
      </aside>
      <main class="map-panel">
        <div ref="mapTarget" class="map-canvas"></div>
        <output class="map-zoom-indicator" aria-label="当前地图缩放级别">
          Zoom {{ stats.zoom.toFixed(1) }}x
        </output>
        <p v-if="baseMapStatusMessage" class="base-map-notice" role="status">
          {{ baseMapStatusMessage }}
        </p>
        <section class="map-scene-indicator" aria-live="polite">
          <span>当前场景</span>
          <strong>{{ activeSceneMeta.label }}</strong>
          <small>{{ activeSceneMeta.description }}</small>
        </section>
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
        <section v-if="layerVisibility.heatmap" class="heatmap-legend" aria-label="热力强度图例">
          <strong>事件风险热力</strong>
          <div class="heatmap-gradient" aria-hidden="true"></div>
          <span><small>低</small><small>高</small></span>
          <p>高等级、未闭环事件权重更高</p>
        </section>
        <section
          v-if="layerVisibility.responsibilityGrid"
          class="grid-summary"
          aria-label="责任网格摘要"
        >
          <strong>责任网格</strong>
          <span><b>12</b> 个网格单元</span>
          <span v-if="workspaceScene === 'replay'">
            <b>{{ trackCoveredGridCount }}/12</b> 已覆盖
          </span>
          <div v-if="workspaceScene === 'replay'" class="coverage-legend" aria-label="巡检覆盖图例">
            <span><i class="current"></i>当前</span>
            <span><i class="visited"></i>已巡</span>
            <span><i></i>未巡</span>
          </div>
          <span><b>{{ scopedEvents.length.toLocaleString() }}</b> 个当前事件</span>
          <span v-if="store.regionEventIds !== null">
            <b>{{ store.regionEventIds.length.toLocaleString() }}</b> 个区域命中
          </span>
        </section>
        <section
          v-if="workspaceScene === 'replay'"
          class="replay-summary"
          aria-label="巡检复盘指标"
        >
          <header>
            <span>路线完成度</span>
            <strong>{{ trackProgressPercent.toFixed(0) }}%</strong>
          </header>
          <div class="replay-progress" aria-hidden="true">
            <i :style="{ width: `${trackProgressPercent}%` }"></i>
          </div>
          <dl>
            <div>
              <dt>已巡里程</dt>
              <dd>{{ trackCompletedDistanceKm.toFixed(2) }} km</dd>
            </div>
            <div>
              <dt>总里程</dt>
              <dd>{{ trackTotalDistanceKm.toFixed(2) }} km</dd>
            </div>
            <div>
              <dt>已用时间</dt>
              <dd>{{ formatTrackDuration(trackElapsedMs) }}</dd>
            </div>
            <div>
              <dt>总时长</dt>
              <dd>{{ formatTrackDuration(trackTotalDurationMs) }}</dd>
            </div>
            <div>
              <dt>覆盖网格</dt>
              <dd>{{ trackCoveredGridCount }} / 12</dd>
            </div>
            <div>
              <dt>当前网格</dt>
              <dd>{{ trackActiveGridLabel }}</dd>
            </div>
          </dl>
          <div class="route-progress-legend" aria-label="巡检路线进度图例">
            <span><i class="completed"></i>实线 已巡</span>
            <span><i></i>虚线 未巡</span>
          </div>
          <footer>
            <span>{{ trackSpeed }}x</span>
            <span>{{ trackStatus }}</span>
            <time>{{ formattedTrackTime }}</time>
          </footer>
        </section>
        <section
          v-if="workspaceScene === 'dispatch'"
          class="dispatch-roster"
          aria-label="巡检人员任务负载"
        >
          <header>
            <span>人员任务负载</span>
            <button
              type="button"
              :class="{ active: assigneeFilter === 'ALL' }"
              @click.stop="applyAssigneeQuickFilter('ALL')"
            >
              全部 {{ assigneeWorkloads.total.toLocaleString() }}
            </button>
          </header>
          <button
            type="button"
            class="unassigned"
            :class="{ active: assigneeFilter === 'UNASSIGNED' }"
            @click.stop="applyAssigneeQuickFilter('UNASSIGNED')"
          >
            <span>未分派</span>
            <strong>{{ assigneeWorkloads.unassigned.toLocaleString() }}</strong>
          </button>
          <button
            v-for="inspector in INSPECTOR_NAMES"
            :key="inspector"
            type="button"
            :class="{ active: assigneeFilter === inspector }"
            @click.stop="applyAssigneeQuickFilter(inspector)"
          >
            <span>{{ inspector }}</span>
            <strong>{{ assigneeWorkloads.counts[inspector]?.toLocaleString() ?? '0' }}</strong>
          </button>
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
            {{ eventFormOpen ? (editingEventId ? '编辑事件' : '新建事件') : '事件处置' }}
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
          <section class="event-dispatch-summary" aria-label="事件调度摘要">
            <div>
              <span>责任网格</span>
              <strong>{{ selectedEvent.address }}</strong>
            </div>
            <div>
              <span>责任人</span>
              <strong>{{ store.selectedEventAssignee ?? '未分派' }}</strong>
            </div>
            <div>
              <span>SLA 时限</span>
              <strong>{{ EVENT_SLA_HOURS[selectedEvent.level] }} 小时</strong>
            </div>
            <div v-if="selectedEventSla" class="sla-summary" :class="selectedEventSla.tone">
              <span>剩余时间</span>
              <strong>{{ selectedEventSla.label }}</strong>
            </div>
          </section>
          <section class="event-dispatch-control" aria-label="任务分派">
            <label>
              <span>分派人员</span>
              <select v-model="dispatchAssignee">
                <option value="">请选择巡检人员</option>
                <option v-for="inspector in INSPECTOR_NAMES" :key="inspector" :value="inspector">
                  {{ inspector }}
                </option>
              </select>
            </label>
            <button type="button" :disabled="!dispatchAssignee" @click="assignSelectedEvent">
              {{ store.selectedEventAssignee ? '确认转派' : '确认分派' }}
            </button>
          </section>
          <section class="event-evidence" aria-label="现场附件">
            <header>
              <span>
                <strong>现场附件</strong>
                <small>{{ selectedEventEvidence.length }}/3</small>
              </span>
              <label :class="{ disabled: selectedEventEvidence.length >= 3 }">
                添加图片
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  :disabled="selectedEventEvidence.length >= 3"
                  @change="addEventEvidence"
                />
              </label>
            </header>
            <p v-if="selectedEventEvidence.length === 0" class="evidence-empty">
              暂无现场图片，可添加处置前后照片。
            </p>
            <div v-else class="evidence-grid">
              <article v-for="attachment in selectedEventEvidence" :key="attachment.id">
                <img :src="attachment.objectUrl" :alt="attachment.name" />
                <div>
                  <strong>{{ attachment.name }}</strong>
                  <small>
                    {{ formatFileSize(attachment.sizeBytes) }} ·
                    {{ formatActivityTime(attachment.addedAt) }}
                  </small>
                </div>
                <button
                  type="button"
                  :aria-label="`移除附件 ${attachment.name}`"
                  @click="removeEventEvidence(selectedEvent.id, attachment.id)"
                >
                  ×
                </button>
              </article>
            </div>
            <p
              v-if="evidenceFeedback"
              class="evidence-feedback"
              :class="{ error: evidenceFeedback.error }"
            >
              {{ evidenceFeedback.message }}
            </p>
          </section>
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
          <template v-if="statusActionLabel">
            <button
              class="status-action"
              type="button"
              :disabled="Boolean(statusActionBlockReason)"
              @click="advanceSelectedEventStatus"
            >
              {{ statusActionLabel }}
            </button>
            <p v-if="statusActionBlockReason" class="status-action-hint" role="status">
              {{ statusActionBlockReason }}
            </p>
          </template>
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
            <strong>处置进度</strong>
            <ol class="disposition-stages">
              <li v-for="stage in dispositionStages" :key="stage.label" :class="stage.state">
                <i aria-hidden="true"></i>
                <span><b>{{ stage.label }}</b></span>
              </li>
            </ol>
            <strong class="activity-heading">操作记录</strong>
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
        <section v-else-if="!eventFormOpen" class="situation-overview" aria-label="当前事件态势">
          <div class="overview-intro">
            <span>当前结果态势</span>
            <strong>{{ situationOverview.total.toLocaleString() }}</strong>
            <small>点击类型或等级可联动筛选地图</small>
          </div>
          <div class="overview-health">
            <article>
              <span>未闭环</span>
              <strong>{{ situationOverview.openCount.toLocaleString() }}</strong>
            </article>
            <article class="overdue">
              <span>已超时</span>
              <strong>{{ situationOverview.overdueOpenCount.toLocaleString() }}</strong>
            </article>
            <article class="healthy">
              <span>SLA 内</span>
              <strong>{{ situationOverview.healthyOpenCount.toLocaleString() }}</strong>
            </article>
          </div>
          <section class="overview-ranking" aria-label="事件类型排行">
            <header>
              <strong>事件类型排行</strong>
              <small>当前结果</small>
            </header>
            <button
              v-for="row in situationOverview.typeRows"
              :key="row.type"
              type="button"
              @click="applyOverviewTypeFilter(row.type)"
            >
              <span>{{ row.label }}</span>
              <i aria-hidden="true"><b :style="{ width: `${row.widthPercent}%` }"></b></i>
              <strong>{{ row.count.toLocaleString() }}</strong>
            </button>
          </section>
          <section class="overview-levels" aria-label="紧急等级构成">
            <header><strong>紧急等级构成</strong></header>
            <button
              v-for="row in situationOverview.levelRows"
              :key="row.level"
              type="button"
              :class="row.level.toLowerCase()"
              @click="applyOverviewLevelFilter(row.level)"
            >
              <span>{{ row.label }}</span>
              <strong>{{ row.ratio }}%</strong>
              <small>{{ row.count.toLocaleString() }} 件</small>
            </button>
          </section>
          <p class="overview-tip">选择地图点位或左侧任务后，可进入分派、取证和处置流程。</p>
        </section>
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
      <strong>视口加载</strong>
      <span>
        状态
        <b>{{ viewportQueryState.status }}</b>
      </span>
      <span>
        完整数据集
        <b>{{ (datasetBuildStats?.datasetSize ?? 0).toLocaleString() }}</b>
      </span>
      <span>
        数据生成
        <b>{{ formatDuration(datasetBuildStats?.generationDurationMs ?? 0) }}</b>
      </span>
      <span>
        索引构建
        <b>{{ formatDuration(datasetBuildStats?.indexBuildDurationMs ?? 0) }}</b>
      </span>
      <span>
        候选/命中
        <b>
          {{ (viewportQueryState.result?.candidateCount ?? 0).toLocaleString() }} /
          {{ (viewportQueryState.result?.matchedCount ?? 0).toLocaleString() }}
        </b>
      </span>
      <span>
        缓存
        <b>{{ viewportQueryState.result?.cacheHit ? '命中' : '未命中' }}</b>
      </span>
      <span>
        BBOX 查询
        <b>{{ formatDuration(viewportQueryState.result?.queryDurationMs ?? 0) }}</b>
      </span>
      <span>
        Feature Diff
        <b>
          +{{ stats.eventSourceDiff?.added ?? 0 }} / ~{{ stats.eventSourceDiff?.updated ?? 0 }} /
          -{{ stats.eventSourceDiff?.removed ?? 0 }} ·
          {{ formatDuration(stats.eventSourceDiff?.durationMs ?? 0) }}
        </b>
      </span>
      <span>
        渲染完成
        <b>
          {{
            stats.renderCompleteMs === null ? '等待渲染' : formatDuration(stats.renderCompleteMs)
          }}
        </b>
      </span>
      <button
        v-if="viewportQueryState.status === 'error'"
        class="viewport-retry"
        type="button"
        @click="retryViewportQuery"
      >
        {{ viewportQueryState.errorMessage }}，重试
      </button>
      <span v-else-if="viewportQueryState.status === 'empty'">当前视口没有匹配事件</span>
      <span v-else-if="viewportQueryState.status === 'loading'">正在加载，地图保留上一结果</span>
    </div>
    <div class="track-controls">
      <strong>轨迹回放</strong>
      <button @click="mapManager?.playTrack()">播放</button>
      <button @click="mapManager?.pauseTrack()">暂停</button>
      <button @click="mapManager?.resetTrack()">重置</button>
      <div class="track-timeline">
        <input
          class="track-progress"
          type="range"
          min="0"
          max="100"
          step="0.1"
          :value="trackProgressPercent"
          aria-label="巡检轨迹播放进度"
          @input="seekTrack"
        />
        <div class="track-checkpoints" aria-label="巡检网格节点快捷跳转">
          <button
            v-for="(_, sequence) in mockInspectionTrack"
            :key="sequence"
            type="button"
            :class="{
              active: sequence === trackActiveGridSequence,
              visited: sequence < trackActiveGridSequence,
            }"
            :aria-label="`跳转到 ${formatTrackGridLabel(sequence)}，第 ${sequence + 1} 个节点`"
            @click="seekTrackCheckpoint(sequence)"
          >
            {{ sequence + 1 }}
          </button>
        </div>
      </div>
      <button :class="{ active: trackSpeed === 1 }" @click="changeTrackSpeed(1)">1x</button>
      <button :class="{ active: trackSpeed === 2 }" @click="changeTrackSpeed(2)">2x</button>
      <button :class="{ active: trackSpeed === 8 }" @click="changeTrackSpeed(8)">8x</button>
      <div class="track-playback-meta" aria-live="off">
        <span>当前巡检时间：<b>{{ formattedTrackTime }}</b></span>
        <span>状态：<b>{{ trackStatus }}</b></span>
      </div>
    </div>
    <footer class="gis-status">
      <span>数据量：{{ store.events.length.toLocaleString() }}</span>
      <span>筛选结果：{{ scopedEvents.length.toLocaleString() }}</span>
      <span>渲染模式：{{ stats.renderMode === 'cluster' ? 'Cluster' : '普通点位' }}</span>
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
  height: 66px;
  padding: 0 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0d1729;
  border-bottom: 1px solid #20314c;
}
.gis-primary-nav {
  align-self: stretch;
  display: flex;
  gap: 8px;
}
.gis-primary-nav button {
  position: relative;
  padding: 0 18px;
  color: #71809a;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 13px;
}
.gis-primary-nav button.active {
  color: #e0f2fe;
}
.gis-primary-nav button.active::after {
  position: absolute;
  right: 12px;
  bottom: 0;
  left: 12px;
  height: 2px;
  background: #38bdf8;
  box-shadow: 0 0 10px #38bdf8;
  content: '';
}
.operations-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
  background: #07101e;
  border-bottom: 1px solid #20314c;
}
.operations-summary article,
.operations-summary button {
  flex: 1 1 150px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 10px;
  min-width: 0;
  padding: 11px 13px;
  background: linear-gradient(135deg, #101d31, #0b1627);
  border: 1px solid #20314c;
  border-radius: 8px;
}
.operations-summary button {
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.operations-summary button:hover,
.operations-summary button.active {
  border-color: #38bdf899;
  background: linear-gradient(135deg, #122b43, #0b1c30);
}
.operations-summary span {
  flex: 1 1 auto;
  color: #71809a;
  font-size: 10px;
}
.operations-summary small {
  flex: 1 1 100%;
  color: #71809a;
  font-size: 10px;
}
.operations-summary strong {
  flex: 0 0 auto;
  margin-left: auto;
  color: #e0f2fe;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}
.operations-summary .pending strong,
.operations-summary .processing strong {
  color: #fbbf24;
}
.operations-summary .overdue strong {
  color: #fb7185;
}
.operations-summary .completed strong {
  color: #2dd4bf;
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
  display: flex;
  height: 640px;
}
.event-list,
.event-detail {
  background: #0b1424;
  overflow: auto;
}
.event-list {
  flex: 0 0 300px;
  border-right: 1px solid #20314c;
}
.event-detail {
  flex: 0 0 320px;
  border-left: 1px solid #20314c;
}
.map-panel {
  flex: 1 1 auto;
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
  display: flex;
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
  flex: 1 1 auto;
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
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  white-space: nowrap;
}
.event-list-side time {
  color: #64748b;
  font-size: 9px;
}
.sla-tag {
  padding: 2px 5px;
  color: #7dd3fc;
  background: #0c4a6e66;
  border: 1px solid #075985;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 500;
}
.sla-tag.overdue {
  color: #fda4af;
  background: #88133752;
  border-color: #9f1239;
}
.sla-tag.done {
  color: #86efac;
  background: #14532d52;
  border-color: #166534;
}
.event-list em {
  font-style: normal;
  font-size: 11px;
  color: #7dd3fc;
}
.event-filters {
  display: flex;
  flex-direction: column;
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
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.filter-grid select {
  flex: 1 1 calc(50% - 3px);
}
.filter-grid select:last-child {
  flex-basis: 100%;
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
  display: flex;
  gap: 8px;
  align-items: center;
  padding-top: 2px;
  color: #71809a;
  font-size: 10px;
}
.event-sort select {
  flex: 1 1 auto;
}
.event-tools {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 8px;
  border-top: 1px solid #20314c;
}
.event-tools > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  color: #94a3b8;
  border: 0;
  font-size: 10px;
}
.event-tools > header small {
  color: #64748b;
  font-weight: 400;
}
.event-tools > div {
  display: flex;
  gap: 6px;
}
.event-tools > div > * {
  flex: 1 1 0;
}
.event-tools button,
.event-import {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 32px;
  padding: 0 7px;
  color: #94a3b8;
  background: #111e32;
  border: 1px solid #2a3d5c;
  border-radius: 5px;
  cursor: pointer;
  font-size: 10px;
}
.event-tools button:hover,
.event-import:hover {
  color: #e0f2fe;
  background: #13243d;
  border-color: #38bdf8;
}
.event-tools i {
  color: #67e8f9;
  font-size: 15px;
  font-style: normal;
  line-height: 1;
}
.event-tools button:disabled {
  color: #475569;
  background: #111827;
  border-color: #263449;
  cursor: not-allowed;
}
.event-tools button:disabled i {
  color: #475569;
}
.event-import {
  position: relative;
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
  padding: 7px 8px;
  color: #71809a;
  background: #11182780;
  border-radius: 5px;
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
  display: flex;
  flex-wrap: wrap;
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
  flex: 1 1 100%;
  display: flex;
  justify-content: space-between;
  color: #71809a;
}
.event-pagination-summary b {
  color: #94a3b8;
  font-weight: 500;
}
.event-pagination button {
  flex: 0 0 30px;
  height: 26px;
  color: #7dd3fc;
  background: #0c2d46;
  border: 1px solid #2a3d5c;
  border-radius: 5px;
  cursor: pointer;
}
.event-page-jump {
  flex: 1 1 auto;
  display: flex;
  gap: 4px;
}
.event-page-jump input {
  flex: 1 1 auto;
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
.base-map-notice {
  position: absolute;
  z-index: 40;
  top: 12px;
  left: 50%;
  max-width: calc(100% - 32px);
  margin: 0;
  padding: 8px 12px;
  transform: translateX(-50%);
  border: 1px solid #f59e0b;
  border-radius: 6px;
  color: #fef3c7;
  background: #78350fe6;
  box-shadow: 0 4px 18px #02061766;
  font-size: 12px;
  text-align: center;
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
.map-zoom-indicator {
  position: absolute;
  right: 10px;
  bottom: 44px;
  z-index: 2;
  min-width: 78px;
  padding: 5px 8px;
  color: #dbeafe;
  background: #08101fe6;
  border: 1px solid #334155;
  border-radius: 5px;
  box-shadow: 0 4px 12px #0206174d;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  text-align: center;
  pointer-events: none;
}
.map-legend {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  display: flex;
  flex-direction: column;
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
.map-scene-indicator {
  position: absolute;
  top: 12px;
  left: 50%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  min-width: 230px;
  padding: 9px 14px;
  color: #dbeafe;
  background: #08101fe6;
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 6px 18px #02061752;
  text-align: center;
  transform: translateX(-50%);
  pointer-events: none;
}
.map-scene-indicator span,
.map-scene-indicator small {
  color: #71809a;
  font-size: 9px;
}
.map-scene-indicator strong {
  margin: 2px 0;
  color: #67e8f9;
  font-size: 12px;
}
.map-legend strong {
  font-size: 12px;
}
.layer-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 7px 12px;
  box-sizing: border-box;
  width: 250px;
  max-width: calc(100% - 24px);
  padding: 10px 12px;
  color: #dbeafe;
  background: #08101fe6;
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 6px 18px #02061752;
  font-size: 11px;
}
.layer-panel strong {
  flex: 1 1 100%;
  font-size: 12px;
}
.layer-panel label {
  flex: 1 1 calc(50% - 6px);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  white-space: nowrap;
  cursor: pointer;
}
.layer-panel input {
  margin: 0;
  accent-color: #38bdf8;
}
.heatmap-legend,
.grid-summary {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px 12px;
  color: #dbeafe;
  background: #08101fe6;
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 6px 18px #02061752;
  font-size: 10px;
  pointer-events: none;
}
.heatmap-legend {
  bottom: 14px;
  left: 12px;
  width: 190px;
}
.heatmap-gradient {
  height: 8px;
  background: linear-gradient(90deg, #2563eb, #22c55e, #facc15, #ef4444);
  border-radius: 999px;
}
.heatmap-legend > span {
  display: flex;
  justify-content: space-between;
  color: #94a3b8;
}
.heatmap-legend p {
  margin: 0;
  color: #71809a;
}
.grid-summary {
  right: 12px;
  bottom: 52px;
  min-width: 160px;
}
.grid-summary span {
  color: #94a3b8;
}
.grid-summary b {
  color: #67e8f9;
  font-variant-numeric: tabular-nums;
}
.coverage-legend {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  border-top: 1px solid #20314c;
  border-bottom: 1px solid #20314c;
}
.coverage-legend span {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 9px;
}
.coverage-legend i {
  width: 6px;
  height: 6px;
  background: #a78bfa;
  border-radius: 50%;
}
.coverage-legend i.current {
  background: #fbbf24;
}
.coverage-legend i.visited {
  background: #4ade80;
}
.replay-summary {
  position: absolute;
  bottom: 14px;
  left: 12px;
  z-index: 2;
  width: 250px;
  padding: 12px;
  color: #dbeafe;
  background: #08101fee;
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 6px 18px #02061752;
  font-size: 10px;
  pointer-events: none;
}
.replay-summary header,
.replay-summary footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.replay-summary header span,
.replay-summary dt {
  color: #71809a;
}
.replay-summary header strong {
  color: #67e8f9;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}
.replay-progress {
  height: 5px;
  margin: 9px 0 11px;
  overflow: hidden;
  background: #1e293b;
  border-radius: 999px;
}
.replay-progress i {
  display: block;
  height: 100%;
  background: #22d3ee;
}
.replay-summary dl {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
}
.replay-summary dl div {
  flex: 1 1 calc(50% - 5px);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.replay-summary dd {
  margin: 0;
  color: #cbd5e1;
  font-variant-numeric: tabular-nums;
}
.replay-summary footer {
  margin-top: 11px;
  padding-top: 9px;
  color: #94a3b8;
  border-top: 1px solid #20314c;
}
.replay-summary footer span:first-child {
  color: #67e8f9;
}
.route-progress-legend {
  display: flex;
  gap: 14px;
  margin-top: 11px;
  padding-top: 9px;
  color: #94a3b8;
  border-top: 1px solid #20314c;
}
.route-progress-legend span {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.route-progress-legend i {
  width: 28px;
  height: 0;
  border-top: 3px dashed #c4b5fd;
}
.route-progress-legend i.completed {
  border-top: 4px solid #8b5cf6;
  box-shadow: 0 -1px 0 #2e1065, 0 1px 0 #2e1065;
}
.dispatch-roster {
  position: absolute;
  bottom: 14px;
  left: 12px;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  width: 270px;
  padding: 10px;
  color: #dbeafe;
  background: #08101fee;
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 6px 18px #02061752;
  font-size: 10px;
}
.dispatch-roster header {
  flex: 1 1 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}
.dispatch-roster header > span {
  font-weight: 700;
}
.dispatch-roster button {
  flex: 1 1 calc(50% - 3px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 7px 8px;
  color: #94a3b8;
  background: #111e32;
  border: 1px solid #2a3d5c;
  border-radius: 5px;
  cursor: pointer;
  font: inherit;
}
.dispatch-roster header button {
  padding: 4px 7px;
}
.dispatch-roster button:hover,
.dispatch-roster button.active {
  color: #e0f2fe;
  background: #0c2d46;
  border-color: #38bdf8;
}
.dispatch-roster button.unassigned {
  flex-basis: 100%;
  color: #fda4af;
  background: #8813373d;
  border-color: #9f123966;
}
.dispatch-roster button.unassigned.active {
  border-color: #fb7185;
}
.dispatch-roster strong {
  color: #67e8f9;
  font-variant-numeric: tabular-nums;
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
  display: flex;
  flex-direction: column;
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
.event-dispatch-summary {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin: 0 16px 16px;
  overflow: hidden;
  background: #20314c;
  border: 1px solid #20314c;
  border-radius: 8px;
}
.event-dispatch-summary > div {
  display: flex;
  gap: 8px;
  padding: 9px 11px;
  background: #0f1b2e;
}
.event-dispatch-summary > div > span {
  flex: 0 0 72px;
}
.event-dispatch-summary > div > strong {
  flex: 1 1 auto;
  min-width: 0;
}
.event-dispatch-summary span {
  color: #71809a;
  font-size: 10px;
}
.event-dispatch-summary strong {
  overflow: hidden;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event-dispatch-summary .sla-summary.normal strong {
  color: #7dd3fc;
}
.event-dispatch-summary .sla-summary.overdue strong {
  color: #fb7185;
}
.event-dispatch-summary .sla-summary.done strong {
  color: #86efac;
}
.event-dispatch-control {
  display: flex;
  gap: 8px;
  margin: 0 16px 16px;
}
.event-dispatch-control label {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #71809a;
  font-size: 10px;
}
.event-dispatch-control select {
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  color: #dbeafe;
  background: #111e32;
  border: 1px solid #2a3d5c;
  border-radius: 5px;
}
.event-dispatch-control button {
  align-self: end;
  height: 32px;
  padding: 0 10px;
  color: #e0f2fe;
  background: #075985;
  border: 1px solid #38bdf8;
  border-radius: 5px;
  cursor: pointer;
}
.event-dispatch-control button:disabled {
  color: #475569;
  background: #111827;
  border-color: #334155;
  cursor: not-allowed;
}
.event-evidence {
  margin: 0 16px 16px;
  padding-top: 14px;
  border-top: 1px solid #20314c;
}
.event-evidence > header {
  align-items: center;
  padding: 0;
  border: 0;
}
.event-evidence > header > span {
  display: flex;
  align-items: center;
  gap: 7px;
}
.event-evidence > header small {
  color: #71809a;
  font-size: 10px;
}
.event-evidence > header label {
  position: relative;
  padding: 5px 8px;
  color: #7dd3fc;
  background: #0c2d46;
  border: 1px solid #38bdf8;
  border-radius: 5px;
  cursor: pointer;
  font-size: 10px;
}
.event-evidence > header label.disabled {
  color: #475569;
  background: #111827;
  border-color: #334155;
  cursor: not-allowed;
}
.event-evidence input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
}
.evidence-empty {
  margin: 10px 0 0;
  color: #64748b;
  font-size: 10px;
  line-height: 1.5;
}
.evidence-grid {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 10px;
}
.evidence-grid article {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px;
  background: #0f1b2e;
  border: 1px solid #20314c;
  border-radius: 6px;
}
.evidence-grid img {
  width: 58px;
  height: 44px;
  object-fit: cover;
  border-radius: 4px;
}
.evidence-grid article > div {
  flex: 1 1 auto;
  min-width: 0;
}
.evidence-grid article strong,
.evidence-grid article small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.evidence-grid article strong {
  color: #cbd5e1;
  font-size: 10px;
}
.evidence-grid article small {
  margin-top: 4px;
  color: #64748b;
  font-size: 9px;
}
.evidence-grid article button {
  width: 24px;
  height: 24px;
  padding: 0;
  color: #94a3b8;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 17px;
}
.evidence-grid article button:hover {
  color: #fda4af;
}
.evidence-feedback {
  margin: 8px 0 0;
  color: #86efac;
  font-size: 10px;
}
.evidence-feedback.error {
  color: #fca5a5;
}
.event-detail dl {
  margin: 0;
  padding: 0 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px 8px;
  font-size: 13px;
}
.event-detail dt {
  flex: 0 0 76px;
}
.event-detail dd {
  flex: 1 1 calc(100% - 84px);
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
.situation-overview {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-bottom: 1px solid #20314c;
}
.overview-intro {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 12px;
  align-items: end;
  padding: 13px;
  background: linear-gradient(135deg, #0c2d46, #111e32);
  border: 1px solid #155e75;
  border-radius: 7px;
}
.overview-intro span {
  flex: 1 1 auto;
  color: #71809a;
  font-size: 10px;
}
.overview-intro small {
  flex: 1 1 100%;
  color: #71809a;
  font-size: 10px;
}
.overview-intro strong {
  flex: 0 0 auto;
  margin-left: auto;
  color: #67e8f9;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}
.overview-health {
  display: flex;
  gap: 6px;
}
.overview-health article {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 9px;
  background: #111e32;
  border-left: 2px solid #fbbf24;
  border-radius: 4px;
}
.overview-health article.overdue {
  border-left-color: #fb7185;
}
.overview-health article.healthy {
  border-left-color: #4ade80;
}
.overview-health span {
  color: #71809a;
  font-size: 9px;
}
.overview-health strong {
  color: #e2e8f0;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.overview-ranking,
.overview-levels {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.overview-ranking header,
.overview-levels header {
  padding: 0;
  border: 0;
}
.overview-ranking header small {
  color: #64748b;
  font-size: 9px;
}
.overview-ranking button {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 5px 0;
  color: #94a3b8;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 10px;
  text-align: left;
}
.overview-ranking button > span {
  flex: 0 0 58px;
}
.overview-ranking button > i {
  flex: 1 1 auto;
}
.overview-ranking button:hover span {
  color: #67e8f9;
}
.overview-ranking i {
  height: 5px;
  overflow: hidden;
  background: #1e293b;
  border-radius: 999px;
}
.overview-ranking i b {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #0891b2, #67e8f9);
  border-radius: inherit;
}
.overview-ranking button > strong {
  color: #cbd5e1;
  font-variant-numeric: tabular-nums;
}
.overview-levels {
  flex-flow: row wrap;
}
.overview-levels header {
  flex: 1 1 100%;
}
.overview-levels button {
  flex: 1 1 calc(33.333% - 5px);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 9px 7px;
  color: #fca5a5;
  background: #7f1d1d2e;
  border: 1px solid #7f1d1d;
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
}
.overview-levels button.medium {
  color: #fde68a;
  background: #78350f2e;
  border-color: #78350f;
}
.overview-levels button.low {
  color: #86efac;
  background: #14532d2e;
  border-color: #14532d;
}
.overview-levels button:hover {
  filter: brightness(1.2);
}
.overview-levels span,
.overview-levels small {
  font-size: 9px;
}
.overview-levels strong {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.overview-levels small {
  color: #71809a;
}
.overview-tip {
  margin: 0;
  color: #64748b;
  font-size: 10px;
  line-height: 1.6;
}
.event-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}
.event-editor label {
  display: flex;
  flex-direction: column;
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
  display: flex;
  gap: 8px;
}
.coordinate-fields label {
  flex: 1 1 0;
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
  display: flex;
  flex-direction: column;
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
.event-timeline .activity-heading {
  display: block;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #20314c;
}
.disposition-stages li.waiting i {
  background: #172033;
  border-color: #475569;
}
.disposition-stages li.waiting b {
  color: #64748b;
}
.disposition-stages li.active i {
  background: #38bdf8;
  box-shadow: 0 0 0 4px #38bdf829;
}
.disposition-stages li.done i {
  background: #22c55e;
}
.event-timeline ol {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.event-timeline li {
  position: relative;
  display: flex;
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
  display: flex;
  flex-direction: column;
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
.status-action:disabled {
  color: #64748b;
  background: #111827;
  border-color: #334155;
  cursor: not-allowed;
}
.status-action:disabled:hover {
  background: #111827;
}
.status-action-hint {
  margin: 7px 16px 0;
  color: #fbbf24;
  font-size: 10px;
  line-height: 1.5;
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
  display: flex;
  flex-direction: column;
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
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 10px;
  padding: 10px;
  background: #111e32;
  border: 1px solid #2a3d5c;
  border-radius: 6px;
}
.region-batch-actions strong,
.region-batch-actions span {
  flex: 1 1 100%;
}
.region-batch-actions button {
  flex: 1 1 calc(50% - 4px);
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
  display: flex;
  margin: 8px 10px;
  border: 1px solid #20314c;
  border-radius: 6px;
  overflow: hidden;
}
.region-open {
  flex: 1 1 auto;
  min-width: 0;
}
.region-delete {
  flex: 0 0 30px;
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
.track-progress {
  width: 100%;
  margin: 0;
  accent-color: #38bdf8;
}
.track-timeline {
  flex: 1 1 260px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 220px;
  padding: 4px 8px 2px;
}
.track-playback-meta {
  flex: 0 0 250px;
  display: flex;
  justify-content: flex-end;
  gap: 18px;
  min-width: 0;
  color: #71809a;
  white-space: nowrap;
}
.track-controls .track-playback-meta span {
  margin-left: 0;
}
.track-playback-meta b {
  display: inline-block;
  min-width: 54px;
  color: #94a3b8;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.track-playback-meta span:last-child b {
  min-width: 48px;
}
.track-checkpoints {
  display: flex;
  justify-content: space-between;
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
.viewport-retry {
  padding: 4px 8px;
  border: 1px solid #f87171;
  border-radius: 4px;
  background: #451a1a;
  color: #fecaca;
  cursor: pointer;
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
.track-checkpoints button {
  width: 16px;
  height: 16px;
  padding: 0;
  color: #64748b;
  background: #111827;
  border: 1px solid #4c1d95;
  border-radius: 50%;
  font-size: 8px;
  line-height: 14px;
}
.track-checkpoints button.visited {
  color: #ede9fe;
  background: #6d28d9;
  border-color: #a78bfa;
}
.track-checkpoints button.active {
  color: #1c1917;
  background: #fbbf24;
  border-color: #fef3c7;
  box-shadow: 0 0 0 3px #fbbf2433;
}
@media (max-width: 1000px) {
  .operations-summary > * {
    flex-basis: calc(33.333% - 7px);
  }
  .event-list {
    flex-basis: 210px;
  }
  .event-detail {
    display: none;
  }
}
@media (max-width: 720px) {
  .gis-primary-nav {
    display: none;
  }
  .operations-summary > * {
    flex-basis: calc(50% - 5px);
  }
  .gis-workspace {
    flex-direction: column;
  }
  .event-list {
    flex: 0 0 210px;
    border-right: 0;
    border-bottom: 1px solid #20314c;
  }
  .gis-header h2 {
    font-size: 16px;
  }
}
</style>
