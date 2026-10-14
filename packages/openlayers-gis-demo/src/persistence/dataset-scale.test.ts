import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GIS_DATASET_SCALE,
  GIS_DATASET_SCALES,
  getDatasetSize,
  isGisDatasetScale,
} from './dataset-scale'

describe('GIS dataset scale protocol', () => {
  it('maps every selectable scale to its exact event capacity', () => {
    expect(GIS_DATASET_SCALES).toEqual(['1k', '10k', '50k', '100k'])
    expect(GIS_DATASET_SCALES.map(getDatasetSize)).toEqual([1_000, 10_000, 50_000, 100_000])
  })

  it('defaults to 10k and rejects values outside the selectable scales', () => {
    expect(DEFAULT_GIS_DATASET_SCALE).toBe('10k')
    expect(isGisDatasetScale('50k')).toBe(true)
    expect(isGisDatasetScale('500k')).toBe(false)
    expect(isGisDatasetScale(10_000)).toBe(false)
  })
})
