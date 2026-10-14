import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { mockInspectionRegions } from '../mock/regions'
import type { EventStatus, InspectionEvent, InspectionEventFilter } from '../types/inspection-event'
import type { EventActivity } from '../types/inspection-event'
import type { InspectionRegion, RegionGeometry } from '../types/region'
import type { PersistedEventDetails } from '../persistence/types'
import { reconcileViewportEvents } from '../viewport/viewport-state'
import type { SpatialAnalysisKind } from '../types/spatial-analysis'

/** 单向处置状态机；DONE 映射 null，表示不允许继续推进或回退。 */
const NEXT_EVENT_STATUS = {
  PENDING: 'PROCESSING',
  PROCESSING: 'DONE',
  DONE: null,
} as const

/** 创建独立筛选对象，避免 reset 时复用同一响应式引用。 */
function createDefaultEventFilter(): InspectionEventFilter {
  return { keyword: '', type: null, status: null, level: null }
}

/** GIS 业务状态入口；只保存可序列化数据，不保存 Map、Layer、Source 或 Feature。 */
export const useGisStore = defineStore('openlayers-gis', () => {
  // Store 只持有当前视口事件，不为服务内部 1k～100k 完整数据集创建响应式代理。
  const events = shallowRef<InspectionEvent[]>([])
  const eventFilter = ref<InspectionEventFilter>(createDefaultEventFilter())
  // 仅保存本次会话发生的增量操作，避免为十万条只读 Mock 事件预建日志对象。
  const eventActivities = ref<Record<string, EventActivity[]>>({})
  // 仅为发生过分派的事件保存人员名称，避免为十万条 Mock 数据预建重复字段。
  const eventAssignees = ref<Record<string, string>>({})
  /** 已保存区域定义；展开数组避免直接修改 Mock 模块导出的集合。 */
  const regions = ref<InspectionRegion[]>([...mockInspectionRegions])
  /** 当前载入地图的已保存区域 ID；自定义未保存区域为 null。 */
  const activeRegionId = ref<string | null>(null)
  /** 地图与列表共享的业务选择，仅保存稳定事件 ID。 */
  const selectedEventId = ref<string | null>(null)
  /** null 表示尚未执行区域筛选；空数组表示已筛选但区域内没有事件。 */
  const regionEventIds = ref<string[] | null>(null)
  /** 当前分析工具；null 表示未进入具体工具。 */
  const activeAnalysisKind = ref<SpatialAnalysisKind | null>(null)
  /** 当前已打开的持久化分析 ID；未保存结果为 null。 */
  const activeAnalysisId = ref<string | null>(null)
  /** 轻量结果摘要；完整事件 ID 集合只保留在 Controller，不进入 Pinia。 */
  const analysisResultSummary = ref<{ kind: SpatialAnalysisKind; eventCount: number | null } | null>(null)
  const selectedEvent = computed(
    () => events.value.find((event) => event.id === selectedEventId.value) ?? null,
  )
  const selectedEventActivities = computed<EventActivity[]>(() => {
    const event = selectedEvent.value
    if (!event) return []
    return [
      {
        id: `${event.id}-created`,
        type: 'CREATED',
        description: '事件已上报',
        occurredAt: event.createdAt,
      },
      ...(eventActivities.value[event.id] ?? []),
    ]
  })
  const selectedEventAssignee = computed(() => {
    const eventId = selectedEventId.value
    return eventId ? (eventAssignees.value[eventId] ?? null) : null
  })
  const filteredEvents = computed(() => {
    const filter = eventFilter.value
    const keyword = filter.keyword.trim().toLocaleLowerCase()
    return events.value.filter(
      (event) =>
        (!filter.type || event.type === filter.type) &&
        (!filter.status || event.status === filter.status) &&
        (!filter.level || event.level === filter.level) &&
        (!keyword ||
          event.id.toLocaleLowerCase().includes(keyword) ||
          event.address.toLocaleLowerCase().includes(keyword)),
    )
  })

  /** 替换整个数据集并重置所有依赖旧事件身份的会话状态。 */
  function setEvents(nextEvents: readonly InspectionEvent[]) {
    // Pinia 只保存可序列化业务对象；OpenLayers Feature 始终留在 MapManager 内部。
    events.value = [...nextEvents]
    eventActivities.value = {}
    eventAssignees.value = {}
    // 切换事件数据集后原区域数量已经失效，保留区域定义但等待重新载入计算。
    regions.value = regions.value.map((region) => ({ ...region, eventIds: null }))
    activeRegionId.value = null
    // 区域命中 ID 属于旧数据源；必须恢复为“未执行区域筛选”，否则新数据会被空数组全部排除。
    regionEventIds.value = null
    if (
      selectedEventId.value &&
      !events.value.some((event) => event.id === selectedEventId.value)
    ) {
      selectedEventId.value = null
    }
  }

  /**
   * 替换当前视口事件，同时清理离开视口的选择和区域结果；不会重置会话内处置记录。
   */
  function replaceViewportEvents(nextEvents: readonly InspectionEvent[]) {
    const reconciled = reconcileViewportEvents(
      {
        events: events.value,
        selectedEventId: selectedEventId.value,
        regionEventIds: regionEventIds.value,
        page: 1,
      },
      nextEvents,
    )
    events.value = [...reconciled.events]
    selectedEventId.value = reconciled.selectedEventId
    regionEventIds.value = reconciled.regionEventIds ? [...reconciled.regionEventIds] : null
  }

  /** 设置业务选择；null 表示清除，调用方负责确保非空 ID 当前可见。 */
  function selectEvent(eventId: string | null) {
    selectedEventId.value = eventId
  }

  /** 查询事件当前责任人；null 表示尚未分派或事件没有分派记录。 */
  function getEventAssignee(eventId: string): string | null {
    return eventAssignees.value[eventId] ?? null
  }

  /** 用持久化详情覆盖单个事件的增量活动和责任人，不影响其他视口事件。 */
  function hydrateEventDetails(eventId: string, details: PersistedEventDetails) {
    eventActivities.value = { ...eventActivities.value, [eventId]: [...details.activities] }
    const nextAssignees = { ...eventAssignees.value }
    if (details.assignee) nextAssignees[eventId] = details.assignee
    else delete nextAssignees[eventId]
    eventAssignees.value = nextAssignees
  }

  /** 恢复当前量级持久化区域；调用方负责保证数据集初始化已经成功。 */
  function setRegions(nextRegions: readonly InspectionRegion[]) {
    regions.value = structuredClone([...nextRegions])
    activeRegionId.value = null
    regionEventIds.value = null
  }

  /** 保存当前区域命中 ID；null 与空数组分别表示未筛选和筛选后无命中。 */
  function selectRegionEvents(eventIds: string[] | null) {
    regionEventIds.value = eventIds
  }

  function setActiveAnalysis(kind: SpatialAnalysisKind | null, analysisId: string | null = null) {
    activeAnalysisKind.value = kind
    activeAnalysisId.value = analysisId
    if (!kind) analysisResultSummary.value = null
  }

  function setAnalysisResultSummary(kind: SpatialAnalysisKind, eventCount: number | null) {
    analysisResultSummary.value = { kind, eventCount }
  }

  /** 追加会话内事件活动，并以替换 Record 的方式触发响应式更新。 */
  function appendEventActivity(
    eventId: string,
    activity: Omit<EventActivity, 'id' | 'occurredAt'>,
  ) {
    const previousActivities = eventActivities.value[eventId] ?? []
    const nextActivity: EventActivity = {
      ...activity,
      id: `${eventId}-activity-${previousActivities.length + 1}`,
      occurredAt: new Date().toISOString(),
    }
    eventActivities.value = {
      ...eventActivities.value,
      [eventId]: [...previousActivities, nextActivity],
    }
  }

  /** 新增一条业务事件；ID 冲突时拒绝写入，避免地图 Feature 身份发生覆盖。 */
  function addEvent(event: InspectionEvent): boolean {
    if (events.value.some((item) => item.id === event.id)) return false
    events.value = [event, ...events.value]
    return true
  }

  /** 批量追加不冲突事件；同批重复或已存在 ID 均跳过，不覆盖当前业务状态。 */
  function addEvents(nextEvents: readonly InspectionEvent[]) {
    const knownIds = new Set(events.value.map((event) => event.id))
    const addedEvents: InspectionEvent[] = []
    let skippedCount = 0
    for (const event of nextEvents) {
      if (knownIds.has(event.id)) {
        skippedCount += 1
        continue
      }
      knownIds.add(event.id)
      addedEvents.push(event)
    }
    if (addedEvents.length > 0) events.value = [...addedEvents, ...events.value]
    return { addedEvents, skippedCount }
  }

  /** 编辑事件的业务字段和坐标；状态仍由独立处置流程管理。 */
  function updateEvent(
    eventId: string,
    changes: Pick<InspectionEvent, 'type' | 'level' | 'lng' | 'lat' | 'address'>,
  ): InspectionEvent | null {
    const eventIndex = events.value.findIndex((event) => event.id === eventId)
    const currentEvent = events.value[eventIndex]
    if (!currentEvent) return null

    const updatedEvent: InspectionEvent = { ...currentEvent, ...changes }
    const nextEvents = [...events.value]
    nextEvents[eventIndex] = updatedEvent
    // shallowRef 需要替换数组才能通知筛选结果、列表和详情面板同步刷新。
    events.value = nextEvents
    appendEventActivity(eventId, { type: 'EDITED', description: '事件资料已更新' })
    return updatedEvent
  }

  /** 删除指定事件，并同步移除区域结果中的失效 ID；返回 false 表示事件不存在。 */
  function removeEvent(eventId: string): boolean {
    if (!events.value.some((event) => event.id === eventId)) return false
    events.value = events.value.filter((event) => event.id !== eventId)
    if (selectedEventId.value === eventId) selectedEventId.value = null
    if (regionEventIds.value !== null) {
      regionEventIds.value = regionEventIds.value.filter((id) => id !== eventId)
    }
    // 已保存区域的几何保持不变，只清理已删除事件，避免列表继续显示过期数量。
    regions.value = regions.value.map((region) => ({
      ...region,
      eventIds: region.eventIds?.filter((id) => id !== eventId) ?? null,
    }))
    const nextActivities = { ...eventActivities.value }
    delete nextActivities[eventId]
    eventActivities.value = nextActivities
    const nextAssignees = { ...eventAssignees.value }
    delete nextAssignees[eventId]
    eventAssignees.value = nextAssignees
    return true
  }

  /** 整体应用筛选快照并规范化关键词首尾空白。 */
  function setEventFilter(nextFilter: InspectionEventFilter) {
    // 整体替换筛选协议，确保一次“应用”只触发一次十万条数据的派生计算。
    eventFilter.value = { ...nextFilter, keyword: nextFilter.keyword.trim() }
  }

  /** 分派或转派事件；事件不存在或人员名称为空时拒绝写入。 */
  function assignEvent(eventId: string, assignee: string): boolean {
    if (!events.value.some((event) => event.id === eventId)) return false
    const normalizedAssignee = assignee.trim()
    if (!normalizedAssignee) return false
    eventAssignees.value = { ...eventAssignees.value, [eventId]: normalizedAssignee }
    appendEventActivity(eventId, {
      type: 'ASSIGNED',
      description: `任务已分派给 ${normalizedAssignee}`,
    })
    return true
  }

  /** 恢复关键词为空、枚举条件均为 null 的默认筛选。 */
  function resetEventFilter() {
    eventFilter.value = createDefaultEventFilter()
  }

  /** 按待处理→处理中→已完成单向推进；已完成事件不会再次变化。 */
  function advanceEventStatus(eventId: string): InspectionEvent | null {
    const eventIndex = events.value.findIndex((event) => event.id === eventId)
    const currentEvent = events.value[eventIndex]
    if (!currentEvent) return null
    const nextStatus = NEXT_EVENT_STATUS[currentEvent.status]
    if (!nextStatus) return null

    const updatedEvent: InspectionEvent = { ...currentEvent, status: nextStatus }
    // shallowRef 不追踪对象内部修改，因此替换数组和目标对象以触发列表、统计与筛选结果更新。
    const nextEvents = [...events.value]
    nextEvents[eventIndex] = updatedEvent
    events.value = nextEvents
    appendEventActivity(eventId, {
      type: 'STATUS_CHANGED',
      description: nextStatus === 'PROCESSING' ? '事件已开始处理' : '事件已完成处置',
    })
    return updatedEvent
  }

  /**
   * 批量推进指定 ID 中处于 fromStatus 的事件；DONE 不可作为起始状态，防止已完成事件回退。
   */
  function advanceEventStatuses(
    eventIds: readonly string[],
    fromStatus: Exclude<EventStatus, 'DONE'>,
  ): InspectionEvent[] {
    const targetIds = new Set(eventIds)
    const nextStatus = NEXT_EVENT_STATUS[fromStatus]
    const occurredAt = new Date().toISOString()
    const updatedEvents: InspectionEvent[] = []
    const nextActivities = { ...eventActivities.value }

    // 一次遍历同时更新业务数组与增量日志，避免区域内大量事件逐条触发响应式写入。
    const nextEvents = events.value.map((event) => {
      if (!targetIds.has(event.id) || event.status !== fromStatus) return event
      const updatedEvent: InspectionEvent = { ...event, status: nextStatus }
      const previousActivities = nextActivities[event.id] ?? []
      nextActivities[event.id] = [
        ...previousActivities,
        {
          id: `${event.id}-activity-${previousActivities.length + 1}`,
          type: 'STATUS_CHANGED',
          description: nextStatus === 'PROCESSING' ? '事件已批量开始处理' : '事件已批量完成处置',
          occurredAt,
        },
      ]
      updatedEvents.push(updatedEvent)
      return updatedEvent
    })

    if (updatedEvents.length === 0) return []
    events.value = nextEvents
    eventActivities.value = nextActivities
    return updatedEvents
  }

  /** 追加并激活已序列化区域；不会自动重算 eventIds。 */
  function saveRegion(region: InspectionRegion) {
    regions.value = [...regions.value, region]
    activeRegionId.value = region.id
  }

  /** 标记当前载入的已保存区域；null 表示没有活动的持久区域。 */
  function selectSavedRegion(regionId: string | null) {
    activeRegionId.value = regionId
  }

  /** 原子更新已保存区域的 WGS84 几何与当前命中事件副本。 */
  function updateRegion(regionId: string, geometry: RegionGeometry, eventIds: readonly string[]) {
    regions.value = regions.value.map((region) =>
      region.id === regionId ? { ...region, geometry, eventIds: [...eventIds] } : region,
    )
  }

  /** 删除区域定义；若删除活动区域则同步清空 activeRegionId。 */
  function removeRegion(regionId: string) {
    regions.value = regions.value.filter((region) => region.id !== regionId)
    if (activeRegionId.value === regionId) activeRegionId.value = null
  }

  return {
    events,
    eventFilter,
    filteredEvents,
    regions,
    activeRegionId,
    selectedEventId,
    selectedEvent,
    selectedEventActivities,
    selectedEventAssignee,
    regionEventIds,
    activeAnalysisKind,
    activeAnalysisId,
    analysisResultSummary,
    setEvents,
    replaceViewportEvents,
    selectEvent,
    getEventAssignee,
    hydrateEventDetails,
    setRegions,
    selectRegionEvents,
    setActiveAnalysis,
    setAnalysisResultSummary,
    addEvent,
    addEvents,
    updateEvent,
    removeEvent,
    setEventFilter,
    resetEventFilter,
    assignEvent,
    advanceEventStatus,
    advanceEventStatuses,
    saveRegion,
    selectSavedRegion,
    updateRegion,
    removeRegion,
  }
})
