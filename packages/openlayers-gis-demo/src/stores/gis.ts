import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { InspectionEvent } from '../types/inspection-event'

export const useGisStore = defineStore('openlayers-gis', () => {
  // 十万条 Mock 事件只会整体替换，不需要为每个对象建立深层响应式代理。
  const events = shallowRef<InspectionEvent[]>([])
  const selectedEventId = ref<string | null>(null)
  /** null 表示尚未执行区域筛选；空数组表示已筛选但区域内没有事件。 */
  const regionEventIds = ref<string[] | null>(null)
  const selectedEvent = computed(
    () => events.value.find((event) => event.id === selectedEventId.value) ?? null,
  )

  function setEvents(nextEvents: readonly InspectionEvent[]) {
    // Pinia 只保存可序列化业务对象；OpenLayers Feature 始终留在 MapManager 内部。
    events.value = [...nextEvents]
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

  return {
    events,
    selectedEventId,
    selectedEvent,
    regionEventIds,
    setEvents,
    selectEvent,
    selectRegionEvents,
  }
})
