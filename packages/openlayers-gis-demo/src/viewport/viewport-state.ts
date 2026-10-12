import type { InspectionEvent } from '../types/inspection-event'
import type { ViewportQueryState } from './types'

export interface ViewportBusinessState {
  /** 当前视口查询成功提交的事件集合，不包含完整 Mock 数据集。 */
  events: readonly InspectionEvent[]
  /** 当前选中业务 ID；事件离开新视口后自动清空。 */
  selectedEventId: string | null
  /** null 表示没有有效区域筛选；空数组表示区域存在但当前视口无命中。 */
  regionEventIds: readonly string[] | null
  /** 当前视口事件列表页码，从 1 开始。 */
  page: number
}

/** 用新视口结果替换事件，并裁剪失效选择与区域命中 ID；分页统一回到第一页。 */
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

/** 仅合并 success/empty 且带结果的状态；loading/error 保留当前业务数据。 */
export function mergeViewportQueryState(
  current: ViewportBusinessState,
  queryState: ViewportQueryState,
): ViewportBusinessState {
  if ((queryState.status !== 'success' && queryState.status !== 'empty') || !queryState.result) {
    return current
  }

  return reconcileViewportEvents(current, queryState.result.events)
}

/** 数据集重建时创建干净业务状态，避免旧版本事件身份泄漏到新数据集。 */
export function resetViewportDatasetState(): ViewportBusinessState {
  return {
    events: [],
    selectedEventId: null,
    regionEventIds: null,
    page: 1,
  }
}
