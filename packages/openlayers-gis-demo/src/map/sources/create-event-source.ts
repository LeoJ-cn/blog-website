import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { fromLonLat } from 'ol/proj.js'
import VectorSource from 'ol/source/Vector.js'
import type { InspectionEvent } from '../../types/inspection-event'
import type { EventFeatureProperties } from '../types/event-feature'

export type EventFeature = Feature<Point>

export function createEventFeature(event: InspectionEvent): EventFeature {
  // 业务坐标统一以 WGS84 保存，进入地图时才转换为默认的 Web Mercator 投影。
  const feature = new Feature<Point>({
    geometry: new Point(fromLonLat([event.lng, event.lat])),
  })
  const properties: EventFeatureProperties = {
    eventId: event.id,
    eventType: event.type,
    status: event.status,
    level: event.level,
  }

  feature.setId(event.id)
  feature.setProperties(properties)
  return feature
}

export function createEventSource(events: readonly InspectionEvent[] = []) {
  return new VectorSource<EventFeature>({
    features: events.map(createEventFeature),
    wrapX: false,
  })
}
