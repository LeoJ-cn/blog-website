import { describe, expect, it } from 'vitest'
import { parseInspectionEventsGeoJson } from './export-events'

function createFeature(id: string) {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [121.4737, 31.2304] },
    properties: {
      id,
      type: 'ROAD_DAMAGE',
      status: 'PENDING',
      level: 'MEDIUM',
      address: `测试地址 ${id}`,
      createdAt: '2026-10-14T00:00:00.000Z',
    },
  }
}

describe('inspection event GeoJSON import classification', () => {
  it('separates invalid features from duplicate IDs within the same file', () => {
    const result = parseInspectionEventsGeoJson({
      type: 'FeatureCollection',
      features: [
        createFeature('IMPORT-1'),
        { ...createFeature('IMPORT-1'), properties: { ...createFeature('IMPORT-1').properties } },
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
        createFeature('IMPORT-2'),
      ],
    })

    expect(result.events.map(({ id }) => id)).toEqual(['IMPORT-1', 'IMPORT-2'])
    expect(result.invalidCount).toBe(1)
    expect(result.duplicateInFileCount).toBe(1)
    expect(result.rejectedCount).toBe(2)
  })

  it('still rejects an invalid root protocol', () => {
    expect(() => parseInspectionEventsGeoJson({ type: 'FeatureCollection' })).toThrow(TypeError)
  })
})
