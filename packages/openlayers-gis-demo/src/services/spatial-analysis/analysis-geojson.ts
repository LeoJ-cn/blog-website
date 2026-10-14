import { GIS_DATASET_SCALES, type GisDatasetScale } from '../../persistence/dataset-scale'
import type { PersistedSpatialAnalysis } from '../../persistence/types'
import type { AnalysisGeometry, SpatialAnalysisInput, SpatialAnalysisKind } from '../../types/spatial-analysis'
import { createWgs84BufferPolygon } from './buffer'
import { validateAnalysisGeometry } from './geometry-validation'

const ANALYSIS_KINDS: readonly SpatialAnalysisKind[] = [
  'DISTANCE', 'AREA', 'BUFFER', 'NEAREST_EVENTS', 'REGION_STATISTICS', 'REGION_COMPARISON',
]
/** 单次导入最多执行 20 条全数据集分析，避免同步批次长时间占用主线程。 */
const MAX_IMPORT_FEATURE_COUNT = 20
/** 单个几何最多 2,000 个坐标点，兼顾城市区域表达与点面精筛成本。 */
const MAX_GEOMETRY_COORDINATE_COUNT = 2_000

type GeoJsonGeometry =
  | { type: 'Point'; coordinates: readonly [number, number] }
  | { type: 'LineString'; coordinates: readonly (readonly [number, number])[] }
  | { type: 'Polygon'; coordinates: readonly (readonly (readonly [number, number])[])[] }
  | { type: 'GeometryCollection'; geometries: readonly GeoJsonGeometry[] }

export interface SpatialAnalysisGeoJsonFeature {
  type: 'Feature'
  id: string
  geometry: GeoJsonGeometry
  properties: {
    name: string
    kind: SpatialAnalysisKind
    datasetScale: GisDatasetScale
    createdAt: string
    updatedAt: string
    /** 坐标协议固定为 WGS84 `[经度, 纬度]`。 */
    coordinateReferenceSystem: 'WGS84'
    distanceUnit: 'meter'
    areaUnit: 'square-meter'
    /** Circle 无法由标准 GeoJSON 原样表达，此处保留原始圆心与米制半径。 */
    circleInputs?: readonly (Extract<AnalysisGeometry, { type: 'Circle' }> | null)[]
    parameters: { radiusMeters?: number; limit?: number; nowTimestamp?: number }
    summary: { distanceMeters?: number; areaSquareMeters?: number; eventCount?: number; riskScore?: number }
  }
}

export interface SpatialAnalysisGeoJson {
  type: 'FeatureCollection'
  features: SpatialAnalysisGeoJsonFeature[]
}

export interface SpatialAnalysisImportDraft {
  /** 文件内源 ID，仅用于重复检测；保存时必须生成新的本地 ID。 */
  sourceId: string
  name: string
  kind: SpatialAnalysisKind
  input: SpatialAnalysisInput
  datasetScale: GisDatasetScale
  createdAt: string
}

export interface SpatialAnalysisGeoJsonImportResult {
  drafts: SpatialAnalysisImportDraft[]
  invalidCount: number
  duplicateInFileCount: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toGeoJsonGeometry(geometry: AnalysisGeometry): GeoJsonGeometry {
  if (geometry.type === 'Point') return { type: 'Point', coordinates: geometry.coordinates }
  if (geometry.type === 'LineString') return { type: 'LineString', coordinates: geometry.coordinates }
  if (geometry.type === 'Polygon') return { type: 'Polygon', coordinates: geometry.rings }
  const polygon = createWgs84BufferPolygon(geometry.center, geometry.radiusMeters)
  return { type: 'Polygon', coordinates: polygon.rings }
}

function getInputGeometries(input: SpatialAnalysisInput): AnalysisGeometry[] {
  return input.kind === 'REGION_COMPARISON' ? [input.geometryA, input.geometryB] : [input.geometry]
}

function getEventCount(record: PersistedSpatialAnalysis): number | undefined {
  const { result } = record
  if (result.kind === 'NEAREST_EVENTS' || result.kind === 'REGION_STATISTICS') return result.eventIds.length
  if (result.kind === 'REGION_COMPARISON') return result.onlyAEventIds.length + result.sharedEventIds.length + result.onlyBEventIds.length
  return undefined
}

/** 将单条分析记录导出为不包含大型事件 ID 集合的 WGS84 FeatureCollection。 */
export function serializeSpatialAnalysisToGeoJson(record: PersistedSpatialAnalysis): SpatialAnalysisGeoJson {
  const geometries = getInputGeometries(record.input)
  const geometry = geometries.length === 1
    ? toGeoJsonGeometry(geometries[0])
    : { type: 'GeometryCollection' as const, geometries: geometries.map(toGeoJsonGeometry) }
  const circleInputs = geometries.map((item) => item.type === 'Circle' ? item : null)
  const parameters = record.input.kind === 'BUFFER'
    ? { radiusMeters: record.input.radiusMeters }
    : record.input.kind === 'NEAREST_EVENTS'
      ? { limit: record.input.limit }
      : record.input.kind === 'REGION_STATISTICS' || record.input.kind === 'REGION_COMPARISON'
        ? { nowTimestamp: record.input.nowTimestamp }
        : {}
  const summary = {
    ...(record.result.kind === 'DISTANCE' ? { distanceMeters: record.result.totalLengthMeters } : {}),
    ...(record.result.kind === 'AREA' ? { areaSquareMeters: record.result.areaSquareMeters } : {}),
    ...(getEventCount(record) === undefined ? {} : { eventCount: getEventCount(record) }),
    ...(record.result.kind === 'REGION_STATISTICS' ? { riskScore: record.result.statistics.riskScore } : {}),
  }
  return { type: 'FeatureCollection', features: [{
    type: 'Feature', id: record.id, geometry,
    properties: {
      name: record.name, kind: record.kind, datasetScale: record.datasetScale,
      createdAt: record.createdAt, updatedAt: record.updatedAt,
      coordinateReferenceSystem: 'WGS84', distanceUnit: 'meter', areaUnit: 'square-meter',
      ...(circleInputs.some(Boolean) ? { circleInputs } : {}), parameters, summary,
    },
  }] }
}

function parseCoordinate(value: unknown): readonly [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2 || !value.every((item) => typeof item === 'number' && Number.isFinite(item))) return null
  return [value[0] as number, value[1] as number]
}

function parseGeometry(value: unknown): AnalysisGeometry | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null
  let geometry: AnalysisGeometry | null = null
  if (value.type === 'Point') {
    const coordinates = parseCoordinate(value.coordinates)
    if (coordinates) geometry = { type: 'Point', coordinates }
  } else if (value.type === 'LineString' && Array.isArray(value.coordinates)) {
    if (value.coordinates.length > MAX_GEOMETRY_COORDINATE_COUNT) return null
    const coordinates = value.coordinates.map(parseCoordinate)
    if (coordinates.every((item) => item !== null)) geometry = { type: 'LineString', coordinates: coordinates as readonly (readonly [number, number])[] }
  } else if (value.type === 'Polygon' && Array.isArray(value.coordinates)) {
    const coordinateCount = value.coordinates.reduce(
      (total, ring) => total + (Array.isArray(ring) ? ring.length : MAX_GEOMETRY_COORDINATE_COUNT + 1),
      0,
    )
    if (coordinateCount > MAX_GEOMETRY_COORDINATE_COUNT) return null
    const rings = value.coordinates.map((ring) => Array.isArray(ring) ? ring.map(parseCoordinate) : [null])
    if (rings.every((ring) => ring.every((item) => item !== null))) geometry = { type: 'Polygon', rings: rings as readonly (readonly (readonly [number, number])[])[] }
  }
  return geometry && validateAnalysisGeometry(geometry).valid ? geometry : null
}

function parseCircle(value: unknown): Extract<AnalysisGeometry, { type: 'Circle' }> | null {
  if (!isRecord(value) || value.type !== 'Circle') return null
  const center = parseCoordinate(value.center)
  if (!center || typeof value.radiusMeters !== 'number') return null
  const circle: Extract<AnalysisGeometry, { type: 'Circle' }> = {
    type: 'Circle',
    center,
    radiusMeters: value.radiusMeters,
  }
  return validateAnalysisGeometry(circle).valid ? circle : null
}

function createInput(kind: SpatialAnalysisKind, geometry: unknown, properties: Record<string, unknown>): SpatialAnalysisInput | null {
  const parameters = isRecord(properties.parameters) ? properties.parameters : {}
  const circles = Array.isArray(properties.circleInputs)
    ? properties.circleInputs.map(parseCircle)
    : []
  if (kind === 'REGION_COMPARISON') {
    if (!isRecord(geometry) || geometry.type !== 'GeometryCollection' || !Array.isArray(geometry.geometries)) return null
    const parsed = geometry.geometries.map(parseGeometry)
    if (parsed.length !== 2 || parsed.some((item) => !item)) return null
    const regions: Extract<AnalysisGeometry, { type: 'Polygon' | 'Circle' }>[] = []
    for (const [index, parsedGeometry] of parsed.entries()) {
      const item: AnalysisGeometry | null = circles.at(index) ?? parsedGeometry
      if (item?.type === 'Polygon' || item?.type === 'Circle') regions.push(item)
    }
    if (regions.length !== 2 || typeof parameters.nowTimestamp !== 'number' || !Number.isFinite(parameters.nowTimestamp)) return null
    return { kind, geometryA: regions[0], geometryB: regions[1], nowTimestamp: parameters.nowTimestamp }
  }
  const parsed: AnalysisGeometry | null = circles.at(0) ?? parseGeometry(geometry)
  if (!parsed) return null
  if (kind === 'DISTANCE' && parsed.type === 'LineString') return { kind, geometry: parsed }
  if (kind === 'AREA' && parsed.type === 'Polygon') return { kind, geometry: parsed }
  if (kind === 'BUFFER' && parsed.type === 'Point' && typeof parameters.radiusMeters === 'number' && Number.isFinite(parameters.radiusMeters) && parameters.radiusMeters > 0) return { kind, geometry: parsed, radiusMeters: parameters.radiusMeters }
  if (kind === 'NEAREST_EVENTS' && parsed.type === 'Point' && Number.isInteger(parameters.limit) && (parameters.limit as number) >= 1 && (parameters.limit as number) <= 100) return { kind, geometry: parsed, limit: parameters.limit as number }
  if (kind === 'REGION_STATISTICS' && (parsed.type === 'Polygon' || parsed.type === 'Circle') && typeof parameters.nowTimestamp === 'number' && Number.isFinite(parameters.nowTimestamp)) return { kind, geometry: parsed, nowTimestamp: parameters.nowTimestamp }
  return null
}

/** 解析不可信分析 GeoJSON；根协议错误抛错，单 Feature 错误计数并跳过。 */
export function parseSpatialAnalysisGeoJson(input: unknown): SpatialAnalysisGeoJsonImportResult {
  if (!isRecord(input) || input.type !== 'FeatureCollection' || !Array.isArray(input.features)) throw new TypeError('文件必须是 GeoJSON FeatureCollection')
  if (input.features.length > MAX_IMPORT_FEATURE_COUNT) {
    throw new RangeError(`单次最多导入 ${MAX_IMPORT_FEATURE_COUNT} 条空间分析`)
  }
  const drafts: SpatialAnalysisImportDraft[] = []
  const sourceIds = new Set<string>()
  let invalidCount = 0
  let duplicateInFileCount = 0
  for (const candidate of input.features) {
    if (!isRecord(candidate) || candidate.type !== 'Feature' || typeof candidate.id !== 'string' || !isRecord(candidate.properties)) { invalidCount += 1; continue }
    if (sourceIds.has(candidate.id)) { duplicateInFileCount += 1; continue }
    const properties = candidate.properties
    const kind = properties.kind as SpatialAnalysisKind
    const scale = properties.datasetScale as GisDatasetScale
    const validEnvelope = ANALYSIS_KINDS.includes(kind) && GIS_DATASET_SCALES.includes(scale) && typeof properties.name === 'string' && properties.name.trim().length > 0 && typeof properties.createdAt === 'string' && Number.isFinite(Date.parse(properties.createdAt)) && typeof properties.updatedAt === 'string' && Number.isFinite(Date.parse(properties.updatedAt)) && properties.coordinateReferenceSystem === 'WGS84' && properties.distanceUnit === 'meter' && properties.areaUnit === 'square-meter'
    const analysisInput = validEnvelope ? createInput(kind, candidate.geometry, properties) : null
    if (!analysisInput) { invalidCount += 1; continue }
    sourceIds.add(candidate.id)
    drafts.push({ sourceId: candidate.id, name: properties.name as string, kind, input: analysisInput, datasetScale: scale, createdAt: properties.createdAt as string })
  }
  return { drafts, invalidCount, duplicateInFileCount }
}
