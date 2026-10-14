import type { EventLevel, EventStatus, EventType, InspectionEvent } from '../types/inspection-event'

/** 导入白名单必须与公开业务联合类型同步，拒绝未知枚举值进入 Store。 */
const EVENT_TYPES: readonly EventType[] = ['ROAD_DAMAGE', 'LIGHT_FAILURE', 'GARBAGE', 'MANHOLE']
const EVENT_STATUSES: readonly EventStatus[] = ['PENDING', 'PROCESSING', 'DONE']
const EVENT_LEVELS: readonly EventLevel[] = ['HIGH', 'MEDIUM', 'LOW']

export interface InspectionEventGeoJsonFeature {
  /** GeoJSON 要素固定标识。 */
  type: 'Feature'
  /** 与 properties.id 保持一致的业务事件主键。 */
  id: string
  geometry: {
    type: 'Point'
    /** GeoJSON 坐标固定按 [WGS84 经度, WGS84 纬度] 排列。 */
    coordinates: readonly [number, number]
  }
  /** 除空间坐标外的完整事件属性；经纬度只保存在 geometry.coordinates。 */
  properties: Omit<InspectionEvent, 'lng' | 'lat'>
}

export interface InspectionEventGeoJson {
  /** GeoJSON 集合固定标识。 */
  type: 'FeatureCollection'
  /** 仅允许本模块定义的 WGS84 Point Feature。 */
  features: InspectionEventGeoJsonFeature[]
}

export interface InspectionEventGeoJsonImportResult {
  events: InspectionEvent[]
  /** 因协议错误或坐标越界跳过的 Feature 数量。 */
  invalidCount: number
  /** 文件内同一 ID 第二次及后续出现的数量；首个合法 Feature 保留。 */
  duplicateInFileCount: number
  /** 兼容总数，恒等于 invalidCount + duplicateInFileCount。 */
  rejectedCount: number
}

/** 将不可信 JSON 缩窄为普通非数组对象，供后续逐字段校验。 */
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
  let invalidCount = 0
  let duplicateInFileCount = 0
  for (const candidate of input.features) {
    if (!isRecord(candidate) || candidate.type !== 'Feature') {
      invalidCount += 1
      continue
    }
    const geometry = candidate.geometry
    const properties = candidate.properties
    if (!isRecord(geometry) || geometry.type !== 'Point' || !isRecord(properties)) {
      invalidCount += 1
      continue
    }
    const coordinates = geometry.coordinates
    const { id, type, status, level, address, createdAt } = properties
    const lng = Array.isArray(coordinates) ? coordinates[0] : undefined
    const lat = Array.isArray(coordinates) ? coordinates[1] : undefined
    const isValid =
      typeof id === 'string' &&
      id.length > 0 &&
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
      invalidCount += 1
      continue
    }
    if (eventIds.has(id)) {
      duplicateInFileCount += 1
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
  return {
    events,
    invalidCount,
    duplicateInFileCount,
    rejectedCount: invalidCount + duplicateInFileCount,
  }
}
