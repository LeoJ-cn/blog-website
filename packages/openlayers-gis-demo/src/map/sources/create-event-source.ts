import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { fromLonLat } from 'ol/proj.js'
import VectorSource from 'ol/source/Vector.js'
import type { InspectionEvent } from '../../types/inspection-event'
import type { EventFeatureProperties } from '../types/event-feature'

export type EventFeature = Feature<Point>

function getEventFeatureProperties(event: InspectionEvent): EventFeatureProperties {
  return {
    eventId: event.id,
    eventType: event.type,
    status: event.status,
    level: event.level,
  }
}

export function createEventFeature(event: InspectionEvent): EventFeature {
  // 业务坐标统一以 WGS84 保存，进入地图时才转换为默认的 Web Mercator 投影。
  const feature = new Feature<Point>({
    geometry: new Point(fromLonLat([event.lng, event.lat])),
  })
  feature.setId(event.id)
  feature.setProperties(getEventFeatureProperties(event))
  return feature
}

/** 就地同步业务字段和坐标，保留 Feature 身份及其空间索引关系。 */
export function updateEventFeature(feature: EventFeature, event: InspectionEvent): void {
  feature.setProperties(getEventFeatureProperties(event))
  feature.getGeometry()?.setCoordinates(fromLonLat([event.lng, event.lat]))
}

export function createEventSource(events: readonly InspectionEvent[] = []) {
  return new VectorSource<EventFeature>({
    features: events.map(createEventFeature),
    wrapX: false,
  })
}
