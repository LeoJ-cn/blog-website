import { describe, expect, it } from 'vitest'
import { generateInspectionEvents } from '../mock/generate-events'
import type { InspectionEvent } from '../types/inspection-event'
import { SpatialGridIndex } from './spatial-grid-index'
import { isEventInsideBbox, validateWgs84Bbox, type Wgs84Bbox } from './types'

function createEvent(id: string, lng: number, lat: number): InspectionEvent {
  return {
    id,
    type: 'ROAD_DAMAGE',
    status: 'PENDING',
    level: 'MEDIUM',
    lng,
    lat,
    address: `测试地址 ${id}`,
    createdAt: '2026-10-11T00:00:00.000Z',
  }
}

describe('WGS84 BBOX protocol', () => {
  it('includes events on every bbox boundary', () => {
    const bbox: Wgs84Bbox = [120, 30, 122, 32]
    const boundaryCoordinates = [
      [120, 31],
      [122, 31],
      [121, 30],
      [121, 32],
      [120, 30],
      [122, 32],
    ] as const

    for (const [lng, lat] of boundaryCoordinates) {
      expect(isEventInsideBbox(createEvent(`${lng}:${lat}`, lng, lat), bbox)).toBe(true)
    }
  })

  it('rejects reversed longitude or latitude bounds', () => {
    expect(() => validateWgs84Bbox([122, 30, 120, 32])).toThrow(RangeError)
    expect(() => validateWgs84Bbox([120, 32, 122, 30])).toThrow(RangeError)
  })

  it('rejects non-finite bbox values', () => {
    expect(() => validateWgs84Bbox([Number.NaN, 30, 122, 32])).toThrow(TypeError)
    expect(() => validateWgs84Bbox([120, 30, Number.POSITIVE_INFINITY, 32])).toThrow(TypeError)
  })

  it('rejects coordinates outside WGS84 bounds', () => {
    expect(() => validateWgs84Bbox([-181, 30, 122, 32])).toThrow(RangeError)
    expect(() => validateWgs84Bbox([120, -91, 122, 32])).toThrow(RangeError)
    expect(() => validateWgs84Bbox([120, 30, 181, 32])).toThrow(RangeError)
    expect(() => validateWgs84Bbox([120, 30, 122, 91])).toThrow(RangeError)
  })
})

describe('SpatialGridIndex', () => {
  it('returns only candidates from intersecting cells', () => {
    const near = createEvent('near', 121.001, 31.001)
    const sameCell = createEvent('same-cell', 121.009, 31.009)
    const far = createEvent('far', 121.021, 31.021)
    const index = new SpatialGridIndex([near, sameCell, far], { cellSizeDegrees: 0.01 })

    expect(index.queryCandidates([121, 31, 121.005, 31.005])).toEqual([near, sameCell])
  })

  it('supports negative longitude and latitude cell keys', () => {
    const southwest = createEvent('southwest', -73.985, -33.451)
    const index = new SpatialGridIndex([southwest], { cellSizeDegrees: 0.01 })

    expect(index.queryCandidates([-73.99, -33.46, -73.98, -33.45])).toEqual([southwest])
  })

  it('deduplicates candidates across queried cells', () => {
    const first = createEvent('first', 0.001, 0.001)
    const duplicateInAnotherCell = createEvent('first', 0.011, 0.011)
    const index = new SpatialGridIndex([first, duplicateInAnotherCell], { cellSizeDegrees: 0.01 })

    expect(index.queryCandidates([0, 0, 0.02, 0.02])).toEqual([first])
  })

  it('reports the number of occupied cells', () => {
    const index = new SpatialGridIndex(
      [createEvent('first', 0.001, 0.001), createEvent('second', 0.011, 0.011)],
      { cellSizeDegrees: 0.01 },
    )

    expect(index.getCellCount()).toBe(2)
  })

  it('matches linear bbox scan for deterministic 1000-event dataset', () => {
    const events = generateInspectionEvents(1_000)
    const bbox: Wgs84Bbox = [121.45, 31.21, 121.49, 31.25]
    const index = new SpatialGridIndex(events, { cellSizeDegrees: 0.01 })
    const indexedMatches = index.queryCandidates(bbox).filter((event) => isEventInsideBbox(event, bbox))
    const linearMatches = events.filter((event) => isEventInsideBbox(event, bbox))

    expect(indexedMatches.map(({ id }) => id).sort()).toEqual(
      linearMatches.map(({ id }) => id).sort(),
    )
  })

  it('rejects non-positive cellSizeDegrees', () => {
    expect(() => new SpatialGridIndex([], { cellSizeDegrees: 0 })).toThrow(RangeError)
    expect(() => new SpatialGridIndex([], { cellSizeDegrees: -0.01 })).toThrow(RangeError)
  })
})
