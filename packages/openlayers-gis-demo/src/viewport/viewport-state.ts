import type { InspectionEvent } from '../types/inspection-event'
import type { ViewportQueryState } from './types'

export interface ViewportBusinessState {
  events: readonly InspectionEvent[]
  selectedEventId: string | null
  /** null 表示没有有效区域筛选；空数组表示区域存在但当前视口无命中。 */
  regionEventIds: readonly string[] | null
  /** 当前视口事件列表页码，从 1 开始。 */
  page: number
}

export function reconcileViewportEvents(
  current: ViewportBusinessState,
  events: readonly InspectionEvent[],
): ViewportBusinessState {
  const nextEvents = [...events]
  const currentEventIds = new Set(nextEvents.map(({ id }) => id))
  return {
    events: nextEvents,
    selectedEventId:
      current.selectedEventId && currentEventIds.has(current.selectedEventId)
        ? current.selectedEventId
        : null,
    regionEventIds:
      current.regionEventIds === null
        ? null
        : current.regionEventIds.filter((eventId) => currentEventIds.has(eventId)),
    page: 1,
  }
}

export function mergeViewportQueryState(
  current: ViewportBusinessState,
  queryState: ViewportQueryState,
): ViewportBusinessState {
  if ((queryState.status !== 'success' && queryState.status !== 'empty') || !queryState.result) {
    return current
  }

  return reconcileViewportEvents(current, queryState.result.events)
}

export function resetViewportDatasetState(): ViewportBusinessState {
  return {
    events: [],
    selectedEventId: null,
    regionEventIds: null,
    page: 1,
  }
}
