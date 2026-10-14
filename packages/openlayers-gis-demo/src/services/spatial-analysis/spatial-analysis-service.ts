import type { InspectionEvent } from '../../types/inspection-event'
import type {
  AnalysisGeometry,
  SpatialAnalysisInput,
  SpatialAnalysisResult,
} from '../../types/spatial-analysis'
import { SpatialGridIndex } from '../../viewport/spatial-grid-index'
import { isEventInsideBbox } from '../../viewport/types'
import { createWgs84BufferPolygon } from './buffer'
import { calculateEventStatistics, calculateRegionBboxes, isPointInsideRegion } from './event-analysis'
import { validateAnalysisGeometry } from './geometry-validation'
import {
  calculateHaversineDistanceMeters,
  calculatePolygonPerimeterMeters,
  calculateSphericalPolygonAreaSquareMeters,
} from './measurement'

const MAX_HIGHLIGHT_EVENT_COUNT = 2_000

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

export interface SpatialAnalysisContext {
  /** 当前数据量级的完整非响应式事件快照。 */
  events: readonly InspectionEvent[]
  /** 与 events 同版本构建的只读空间索引。 */
  index: SpatialGridIndex
}

type RegionGeometry = Extract<AnalysisGeometry, { type: 'Polygon' | 'Circle' }>

function assertValidGeometry(geometry: AnalysisGeometry): void {
  const validation = validateAnalysisGeometry(geometry)
  if (!validation.valid) throw new RangeError(validation.reason)
}

function getHighlight(eventIds: readonly string[]) {
  return {
    highlightEventIds: eventIds.slice(0, MAX_HIGHLIGHT_EVENT_COUNT),
    highlightTruncated: eventIds.length > MAX_HIGHLIGHT_EVENT_COUNT,
  }
}

function queryRegionEvents(
  geometry: RegionGeometry,
  context: SpatialAnalysisContext,
): InspectionEvent[] {
  const eventById = new Map<string, InspectionEvent>()
  for (const bbox of calculateRegionBboxes(geometry)) {
    for (const event of context.index.queryCandidates(bbox)) {
      if (isEventInsideBbox(event, bbox)) eventById.set(event.id, event)
    }
  }
  return [...eventById.values()].filter((event) => isPointInsideRegion([event.lng, event.lat], geometry))
}

/** 在完整数据集快照上执行可序列化空间分析，不依赖 Pinia 或当前视口事件。 */
export class SpatialAnalysisService {
  async execute(
    input: SpatialAnalysisInput,
    context: SpatialAnalysisContext,
  ): Promise<SpatialAnalysisResult> {
    switch (input.kind) {
      case 'DISTANCE': {
        assertValidGeometry(input.geometry)
        const segmentLengthsMeters = input.geometry.coordinates
          .slice(1)
          .map((coordinate, index) =>
            calculateHaversineDistanceMeters(input.geometry.coordinates[index], coordinate),
          )
        return {
          kind: input.kind,
          geometry: input.geometry,
          segmentLengthsMeters,
          totalLengthMeters: segmentLengthsMeters.reduce((total, length) => total + length, 0),
        }
      }
      case 'AREA':
        assertValidGeometry(input.geometry)
        return {
          kind: input.kind,
          geometry: input.geometry,
          areaSquareMeters: calculateSphericalPolygonAreaSquareMeters(input.geometry.rings),
          perimeterMeters: calculatePolygonPerimeterMeters(input.geometry.rings),
        }
      case 'BUFFER':
        assertValidGeometry(input.geometry)
        return {
          kind: input.kind,
          geometry: createWgs84BufferPolygon(input.geometry.coordinates, input.radiusMeters),
          radiusMeters: input.radiusMeters,
        }
      case 'NEAREST_EVENTS': {
        assertValidGeometry(input.geometry)
        if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) {
          throw new RangeError('NEAREST_LIMIT_OUT_OF_RANGE')
        }
        const matches = context.index
          .queryNearestCandidates(input.geometry.coordinates, input.limit)
          .map((event) => ({
            eventId: event.id,
            distanceMeters: calculateHaversineDistanceMeters(input.geometry.coordinates, [event.lng, event.lat]),
          }))
          .sort(
            (left, right) =>
              left.distanceMeters - right.distanceMeters ||
              compareCodeUnits(left.eventId, right.eventId),
          )
          .slice(0, input.limit)
        const eventIds = matches.map((match) => match.eventId)
        return { kind: input.kind, matches, eventIds, ...getHighlight(eventIds) }
      }
      case 'REGION_STATISTICS': {
        assertValidGeometry(input.geometry)
        const events = queryRegionEvents(input.geometry, context)
        const eventIds = events.map((event) => event.id).sort()
        return {
          kind: input.kind,
          geometry: input.geometry,
          eventIds,
          ...getHighlight(eventIds),
          statistics: calculateEventStatistics(events, input.nowTimestamp),
        }
      }
      case 'REGION_COMPARISON': {
        assertValidGeometry(input.geometryA)
        assertValidGeometry(input.geometryB)
        const eventsA = queryRegionEvents(input.geometryA, context)
        const eventsB = queryRegionEvents(input.geometryB, context)
        const idsA = new Set(eventsA.map((event) => event.id))
        const idsB = new Set(eventsB.map((event) => event.id))
        const onlyAEventIds = [...idsA].filter((id) => !idsB.has(id)).sort()
        const sharedEventIds = [...idsA].filter((id) => idsB.has(id)).sort()
        const onlyBEventIds = [...idsB].filter((id) => !idsA.has(id)).sort()
        const allEventIds = [...onlyAEventIds, ...sharedEventIds, ...onlyBEventIds]
        return {
          kind: input.kind,
          geometryA: input.geometryA,
          geometryB: input.geometryB,
          onlyAEventIds,
          sharedEventIds,
          onlyBEventIds,
          statisticsA: calculateEventStatistics(eventsA, input.nowTimestamp),
          statisticsB: calculateEventStatistics(eventsB, input.nowTimestamp),
          ...getHighlight(allEventIds),
        }
      }
    }
  }
}
