import type { InspectionEvent } from '../types/inspection-event'

export interface InspectionEventGeoJsonFeature {
  type: 'Feature'
  id: string
  geometry: {
    type: 'Point'
    /** GeoJSON 坐标固定按 [WGS84 经度, WGS84 纬度] 排列。 */
    coordinates: readonly [number, number]
  }
  properties: Omit<InspectionEvent, 'lng' | 'lat'>
}

export interface InspectionEventGeoJson {
  type: 'FeatureCollection'
  features: InspectionEventGeoJsonFeature[]
}

/** 将业务事件序列化为标准 WGS84 Point FeatureCollection，不包含 OpenLayers 运行时对象。 */
export function serializeInspectionEventsToGeoJson(
  events: readonly InspectionEvent[],
): InspectionEventGeoJson {
  return {
    type: 'FeatureCollection',
    features: events.map(({ lng, lat, ...properties }) => ({
      type: 'Feature',
      id: properties.id,
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties,
    })),
  }
}
