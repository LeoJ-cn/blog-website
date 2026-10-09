import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { mockInspectionRegions } from '../mock/regions'
import type { InspectionEvent, InspectionEventFilter } from '../types/inspection-event'
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
  const regions = ref<InspectionRegion[]>([...mockInspectionRegions])
  const activeRegionId = ref<string | null>(null)
  const selectedEventId = ref<string | null>(null)
  /** null 表示尚未执行区域筛选；空数组表示已筛选但区域内没有事件。 */
  const regionEventIds = ref<string[] | null>(null)
  const selectedEvent = computed(
    () => events.value.find((event) => event.id === selectedEventId.value) ?? null,
  )
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
    return updatedEvent
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
    regionEventIds,
    setEvents,
    selectEvent,
    selectRegionEvents,
    setEventFilter,
    resetEventFilter,
    advanceEventStatus,
    saveRegion,
    selectSavedRegion,
    updateRegion,
    removeRegion,
  }
})
