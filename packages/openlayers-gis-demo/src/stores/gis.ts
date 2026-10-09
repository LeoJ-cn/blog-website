import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { mockInspectionRegions } from '../mock/regions'
import type { EventStatus, InspectionEvent, InspectionEventFilter } from '../types/inspection-event'
import type { EventActivity } from '../types/inspection-event'
import type { InspectionRegion, RegionGeometry } from '../types/region'

const NEXT_EVENT_STATUS = {
  PENDING: 'PROCESSING',
  PROCESSING: 'DONE',
  DONE: null,
} as const

function createDefaultEventFilter(): InspectionEventFilter {
  return { keyword: '', type: null, status: null, level: null }
}

export const useGisStore = defineStore('openlayers-gis', () => {
  // 十万条 Mock 事件只会整体替换，不需要为每个对象建立深层响应式代理。
  const events = shallowRef<InspectionEvent[]>([])
  const eventFilter = ref<InspectionEventFilter>(createDefaultEventFilter())
  // 仅保存本次会话发生的增量操作，避免为十万条只读 Mock 事件预建日志对象。
  const eventActivities = ref<Record<string, EventActivity[]>>({})
  const regions = ref<InspectionRegion[]>([...mockInspectionRegions])
  const activeRegionId = ref<string | null>(null)
  const selectedEventId = ref<string | null>(null)
  /** null 表示尚未执行区域筛选；空数组表示已筛选但区域内没有事件。 */
  const regionEventIds = ref<string[] | null>(null)
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

  function setEvents(nextEvents: readonly InspectionEvent[]) {
    // Pinia 只保存可序列化业务对象；OpenLayers Feature 始终留在 MapManager 内部。
    events.value = [...nextEvents]
    eventActivities.value = {}
    // 切换事件数据集后原区域数量已经失效，保留区域定义但等待重新载入计算。
    regions.value = regions.value.map((region) => ({ ...region, eventIds: null }))
    activeRegionId.value = null
    if (
      selectedEventId.value &&
      !events.value.some((event) => event.id === selectedEventId.value)
    ) {
      selectedEventId.value = null
    }
  }

  function selectEvent(eventId: string | null) {
    selectedEventId.value = eventId
  }

  function selectRegionEvents(eventIds: string[] | null) {
    regionEventIds.value = eventIds
  }

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
    return true
  }

  function setEventFilter(nextFilter: InspectionEventFilter) {
    // 整体替换筛选协议，确保一次“应用”只触发一次十万条数据的派生计算。
    eventFilter.value = { ...nextFilter, keyword: nextFilter.keyword.trim() }
  }

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

  function saveRegion(region: InspectionRegion) {
    regions.value = [...regions.value, region]
    activeRegionId.value = region.id
  }

  function selectSavedRegion(regionId: string | null) {
    activeRegionId.value = regionId
  }

  function updateRegion(regionId: string, geometry: RegionGeometry, eventIds: readonly string[]) {
    regions.value = regions.value.map((region) =>
      region.id === regionId ? { ...region, geometry, eventIds: [...eventIds] } : region,
    )
  }

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
    regionEventIds,
    setEvents,
    selectEvent,
    selectRegionEvents,
    addEvent,
    updateEvent,
    removeEvent,
    setEventFilter,
    resetEventFilter,
    advanceEventStatus,
    advanceEventStatuses,
    saveRegion,
    selectSavedRegion,
    updateRegion,
    removeRegion,
  }
})
