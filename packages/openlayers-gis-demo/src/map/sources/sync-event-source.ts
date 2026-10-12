import type VectorSource from 'ol/source/Vector.js' // OpenLayers 矢量数据源类型，用于增量同步事件要素。
import { fromLonLat } from 'ol/proj.js' // 将业务经纬度转换为数据源内几何使用的投影坐标。
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

/** 比较 Feature 的业务属性与投影坐标，判断是否需要就地更新。 */
export function hasEventFeatureChanged(feature: EventFeature, event: InspectionEvent): boolean {
  const expectedProperties = getEventFeatureProperties(event)
  if (
    // get(key) 读取 Feature 自定义属性，用于判断是否需要触发一次就地更新。
    feature.get('eventId') !== expectedProperties.eventId ||
    feature.get('eventType') !== expectedProperties.eventType ||
    feature.get('status') !== expectedProperties.status ||
    feature.get('level') !== expectedProperties.level
  ) {
    return true
  }

  // getGeometry 获取 Point，getCoordinates 返回当前投影坐标 [x, y]。
  const currentCoordinates = feature.getGeometry()?.getCoordinates()
  // fromLonLat 接收 [经度, 纬度]，返回默认 EPSG:3857 坐标用于精确比较。
  const expectedCoordinates = fromLonLat([event.lng, event.lat])
  return (
    !currentCoordinates ||
    currentCoordinates[0] !== expectedCoordinates[0] ||
    currentCoordinates[1] !== expectedCoordinates[1]
  )
}

/** 按稳定事件 ID 对 Source 执行增删改 Diff，并保留未变化及更新 Feature 的对象身份。 */
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

  // getFeatures() 返回 Source 当前要素数组的快照，遍历时可安全收集待删除项。
  for (const feature of source.getFeatures()) {
    // getId() 读取由 setId 写入的稳定业务主键，不依赖可变属性对象。
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
    // removeFeatures 批量移除并同步更新 Source 的空间索引与渲染状态。
    source.removeFeatures(featuresToRemove)
  }
  const featuresToAdd = [...nextEventsById.values()].map(createEventFeature)
  if (featuresToAdd.length > 0) {
    // addFeatures 批量加入新要素，避免逐条调用导致重复刷新。
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
