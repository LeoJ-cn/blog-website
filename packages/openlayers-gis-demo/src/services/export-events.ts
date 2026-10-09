import type { EventLevel, EventStatus, EventType, InspectionEvent } from '../types/inspection-event'

const EVENT_TYPES: readonly EventType[] = ['ROAD_DAMAGE', 'LIGHT_FAILURE', 'GARBAGE', 'MANHOLE']
const EVENT_STATUSES: readonly EventStatus[] = ['PENDING', 'PROCESSING', 'DONE']
const EVENT_LEVELS: readonly EventLevel[] = ['HIGH', 'MEDIUM', 'LOW']

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

export interface InspectionEventGeoJsonImportResult {
  events: InspectionEvent[]
  /** 因协议错误、坐标越界或文件内 ID 重复而跳过的 Feature 数量。 */
  rejectedCount: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

/**
 * 校验并解析不可信 GeoJSON；根协议错误时抛出 TypeError，单条错误则计入 rejectedCount。
 */
export function parseInspectionEventsGeoJson(input: unknown): InspectionEventGeoJsonImportResult {
  if (!isRecord(input) || input.type !== 'FeatureCollection' || !Array.isArray(input.features)) {
    throw new TypeError('文件必须是 GeoJSON FeatureCollection')
  }

  const events: InspectionEvent[] = []
  const eventIds = new Set<string>()
  let rejectedCount = 0
  for (const candidate of input.features) {
    if (!isRecord(candidate) || candidate.type !== 'Feature') {
      rejectedCount += 1
      continue
    }
    const geometry = candidate.geometry
    const properties = candidate.properties
    if (!isRecord(geometry) || geometry.type !== 'Point' || !isRecord(properties)) {
      rejectedCount += 1
      continue
    }
    const coordinates = geometry.coordinates
    const { id, type, status, level, address, createdAt } = properties
    const lng = Array.isArray(coordinates) ? coordinates[0] : undefined
    const lat = Array.isArray(coordinates) ? coordinates[1] : undefined
    const isValid =
      typeof id === 'string' &&
      id.length > 0 &&
      !eventIds.has(id) &&
      EVENT_TYPES.includes(type as EventType) &&
      EVENT_STATUSES.includes(status as EventStatus) &&
      EVENT_LEVELS.includes(level as EventLevel) &&
      typeof address === 'string' &&
      typeof createdAt === 'string' &&
      !Number.isNaN(Date.parse(createdAt)) &&
      typeof lng === 'number' &&
      Number.isFinite(lng) &&
      lng >= -180 &&
      lng <= 180 &&
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      lat >= -90 &&
      lat <= 90
    if (!isValid) {
      rejectedCount += 1
      continue
    }
    eventIds.add(id)
    events.push({
      id,
      type: type as EventType,
      status: status as EventStatus,
      level: level as EventLevel,
      lng,
      lat,
      address,
      createdAt,
    })
  }
  return { events, rejectedCount }
}
