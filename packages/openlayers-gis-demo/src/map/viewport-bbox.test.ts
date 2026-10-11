import { fromLonLat } from 'ol/proj.js'
import { describe, expect, it } from 'vitest'
import { calculateWgs84ViewportBbox } from './viewport-bbox'

describe('calculateWgs84ViewportBbox', () => {
  it('converts an EPSG:3857 extent to ordered WGS84 bounds', () => {
    const southwest = fromLonLat([121, 31])
    const northeast = fromLonLat([122, 32])

    const bbox = calculateWgs84ViewportBbox(
      [southwest[0]!, southwest[1]!, northeast[0]!, northeast[1]!],
      'EPSG:3857',
    )

    expect(bbox[0]).toBeCloseTo(121, 8)
    expect(bbox[1]).toBeCloseTo(31, 8)
    expect(bbox[2]).toBeCloseTo(122, 8)
    expect(bbox[3]).toBeCloseTo(32, 8)
  })

  it('returns coordinates in min longitude min latitude max longitude max latitude order', () => {
    expect(calculateWgs84ViewportBbox([121, 31, 122, 32], 'EPSG:4326')).toEqual([
      121, 31, 122, 32,
    ])
  })

  it('clamps transformed values to legal WGS84 bounds', () => {
    expect(calculateWgs84ViewportBbox([-200, -100, 200, 100], 'EPSG:4326')).toEqual([
      -180, -90, 180, 90,
    ])
  })

  it('rejects non-finite extents', () => {
    expect(() =>
      calculateWgs84ViewportBbox([Number.NaN, 31, 122, 32], 'EPSG:4326'),
    ).toThrow(TypeError)
    expect(() =>
      calculateWgs84ViewportBbox([121, 31, Number.POSITIVE_INFINITY, 32], 'EPSG:4326'),
    ).toThrow(TypeError)
  })

  it('rejects reversed extents', () => {
    expect(() => calculateWgs84ViewportBbox([122, 31, 121, 32], 'EPSG:4326')).toThrow(
      RangeError,
    )
    expect(() => calculateWgs84ViewportBbox([121, 32, 122, 31], 'EPSG:4326')).toThrow(
      RangeError,
    )
  })
})
