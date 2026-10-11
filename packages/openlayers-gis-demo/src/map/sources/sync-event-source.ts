import type VectorSource from 'ol/source/Vector.js'
import { fromLonLat } from 'ol/proj.js'
import type { InspectionEvent } from '../../types/inspection-event'
import {
  createEventFeature,
  getEventFeatureProperties,
  updateEventFeature,
  type EventFeature,
} from './create-event-source'

export interface EventSourceDiffStats {
  /** 本批新增的 Feature 数量。 */
  added: number
  /** 本批就地更新且保持身份的 Feature 数量。 */
  updated: number
  /** 本批从 Source 删除的 Feature 数量。 */
  removed: number
  /** 本批业务字段和坐标均未变化的 Feature 数量。 */
  unchanged: number
  /** 完成属性比较和 Source 更新的同步耗时，单位为毫秒。 */
  durationMs: number
  /** 被本批删除的选中事件 ID；null 表示选择仍有效或此前没有选择。 */
  removedSelectedEventId: string | null
}

export function hasEventFeatureChanged(feature: EventFeature, event: InspectionEvent): boolean {
  const expectedProperties = getEventFeatureProperties(event)
  if (
    feature.get('eventId') !== expectedProperties.eventId ||
    feature.get('eventType') !== expectedProperties.eventType ||
    feature.get('status') !== expectedProperties.status ||
    feature.get('level') !== expectedProperties.level
  ) {
    return true
  }

  const currentCoordinates = feature.getGeometry()?.getCoordinates()
  const expectedCoordinates = fromLonLat([event.lng, event.lat])
  return (
    !currentCoordinates ||
    currentCoordinates[0] !== expectedCoordinates[0] ||
    currentCoordinates[1] !== expectedCoordinates[1]
  )
}

export function syncEventSource(
  source: VectorSource<EventFeature>,
  events: readonly InspectionEvent[],
  selectedEventId: string | null = null,
): EventSourceDiffStats {
  const startedAt = performance.now()
  const nextEventsById = new Map<string, InspectionEvent>()
  for (const event of events) {
    if (nextEventsById.has(event.id)) {
      throw new Error(`Duplicate inspection event id in viewport result: ${event.id}`)
    }
    nextEventsById.set(event.id, event)
  }

  const featuresToRemove: EventFeature[] = []
  let updated = 0
  let unchanged = 0
  let removedSelectedEventId: string | null = null

  for (const feature of source.getFeatures()) {
    const featureId = feature.getId()
    if (typeof featureId !== 'string') {
      featuresToRemove.push(feature)
      continue
    }

    const nextEvent = nextEventsById.get(featureId)
    if (!nextEvent) {
      featuresToRemove.push(feature)
      if (featureId === selectedEventId) removedSelectedEventId = featureId
      continue
    }

    if (hasEventFeatureChanged(feature, nextEvent)) {
      updateEventFeature(feature, nextEvent)
      updated += 1
    } else {
      unchanged += 1
    }
    nextEventsById.delete(featureId)
  }

  if (featuresToRemove.length > 0) {
    source.removeFeatures(featuresToRemove)
  }
  const featuresToAdd = [...nextEventsById.values()].map(createEventFeature)
  if (featuresToAdd.length > 0) {
    source.addFeatures(featuresToAdd)
  }

  return {
    added: featuresToAdd.length,
    updated,
    removed: featuresToRemove.length,
    unchanged,
    durationMs: performance.now() - startedAt,
    removedSelectedEventId,
  }
}
