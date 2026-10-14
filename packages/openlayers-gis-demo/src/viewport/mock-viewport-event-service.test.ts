import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateInspectionEvents } from '../mock/generate-events'
import type { InspectionEvent, InspectionEventFilter } from '../types/inspection-event'
import { createMockViewportEventService } from './mock-viewport-event-service'
import { isEventInsideBbox, type Wgs84Bbox } from './types'

const EMPTY_FILTER: InspectionEventFilter = {
  keyword: '',
  type: null,
  status: null,
  level: null,
}
const DATASET_BBOX: Wgs84Bbox = [121.4, 31.15, 121.55, 31.3]

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

afterEach(() => {
  vi.useRealTimers()
})

describe('MockViewportEventService dataset and filters', () => {
  it('keeps every smaller dataset as an exact prefix of the 100k fixture', () => {
    const largestDataset = generateInspectionEvents(100_000)

    expect(generateInspectionEvents(1_000)).toEqual(largestDataset.slice(0, 1_000))
    expect(generateInspectionEvents(10_000)).toEqual(largestDataset.slice(0, 10_000))
    expect(generateInspectionEvents(50_000)).toEqual(largestDataset.slice(0, 50_000))
    expect(largestDataset[999]?.id).toBe('EVT-001000')
    expect(largestDataset[9_999]?.id).toBe('EVT-010000')
    expect(largestDataset[49_999]?.id).toBe('EVT-050000')
  })

  it('setDatasetSize builds deterministic dataset and increments version', async () => {
    const firstService = createMockViewportEventService(10)
    const secondService = createMockViewportEventService(10)

    const firstResult = await firstService.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })
    const secondResult = await secondService.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })
    const buildStats = firstService.setDatasetSize(10)
    const rebuiltResult = await firstService.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })

    expect(firstResult.events).toEqual(secondResult.events)
    expect(buildStats.datasetVersion).toBe(firstResult.datasetVersion + 1)
    expect(rebuiltResult.datasetVersion).toBe(buildStats.datasetVersion)
  })

  it('query matches linear scan with keyword type status and level filters', async () => {
    const events = generateInspectionEvents(1_000)
    const filter: InspectionEventFilter = {
      keyword: '巡检网格 001',
      type: 'ROAD_DAMAGE',
      status: 'PENDING',
      level: 'HIGH',
    }
    const bbox: Wgs84Bbox = [121.44, 31.2, 121.51, 31.27]
    const service = createMockViewportEventService(1_000)
    const result = await service.query({ bbox, filter })
    const keyword = filter.keyword.toLocaleLowerCase()
    const expected = events.filter(
      (event) =>
        isEventInsideBbox(event, bbox) &&
        event.type === filter.type &&
        event.status === filter.status &&
        event.level === filter.level &&
        (event.id.toLocaleLowerCase().includes(keyword) ||
          event.address.toLocaleLowerCase().includes(keyword)),
    )

    expect(result.events).toEqual(expected)
    expect(result.matchedCount).toBe(result.events.length)
    expect(result.candidateCount).toBeGreaterThanOrEqual(result.matchedCount)
  })

  it('setDatasetSize clears prior cache and returns build timings', async () => {
    const service = createMockViewportEventService(100)
    await service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })
    expect((await service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })).cacheHit).toBe(true)

    const stats = service.setDatasetSize(200)
    const result = await service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })

    expect(stats).toMatchObject({
      datasetSize: 200,
      indexedCellCount: expect.any(Number),
      generationDurationMs: expect.any(Number),
      indexBuildDurationMs: expect.any(Number),
    })
    expect(stats.indexedCellCount).toBeGreaterThan(0)
    expect(stats.generationDurationMs).toBeGreaterThanOrEqual(0)
    expect(stats.indexBuildDurationMs).toBeGreaterThanOrEqual(0)
    expect(result.cacheHit).toBe(false)
  })

  it('replaces generated data with a restored snapshot and invalidates cached queries', async () => {
    const service = createMockViewportEventService(10, { latencyMs: 0 })
    await service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })
    const restored = [createEvent('restored', 121.47, 31.23)]

    const stats = service.replaceDataset(restored)
    const result = await service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })

    expect(stats.datasetSize).toBe(1)
    expect(stats.generationDurationMs).toBe(0)
    expect(result.cacheHit).toBe(false)
    expect(result.events).toEqual(restored)
  })

  it('rejects duplicate IDs from an injected dataset factory', () => {
    expect(() =>
      createMockViewportEventService(2, {
        datasetFactory: () => [createEvent('duplicate', 0, 0), createEvent('duplicate', 1, 1)],
      }),
    ).toThrow(/duplicate/iu)
  })
})

describe('MockViewportEventService bounded cache', () => {
  it('hits cache only for the same dataset bbox and filters', async () => {
    const service = createMockViewportEventService(100)

    expect((await service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })).cacheHit).toBe(false)
    expect((await service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })).cacheHit).toBe(true)
    expect(
      (
        await service.query({
          bbox: DATASET_BBOX,
          filter: { ...EMPTY_FILTER, status: 'DONE' },
        })
      ).cacheHit,
    ).toBe(false)
  })

  it('re-filters cached quantized candidates against the real bbox', async () => {
    const insideNarrowBbox = createEvent('inside', 0.001, 0.001)
    const onlyInsideWiderBbox = createEvent('outside', 0.009, 0.009)
    const service = createMockViewportEventService(2, {
      cellSizeDegrees: 0.01,
      datasetFactory: () => [insideNarrowBbox, onlyInsideWiderBbox],
    })

    const narrow = await service.query({ bbox: [0, 0, 0.005, 0.005], filter: EMPTY_FILTER })
    const wider = await service.query({ bbox: [0, 0, 0.009, 0.009], filter: EMPTY_FILTER })

    expect(narrow.events).toEqual([insideNarrowBbox])
    expect(wider.cacheHit).toBe(true)
    expect(wider.events).toEqual([insideNarrowBbox, onlyInsideWiderBbox])
  })

  it('evicts the least recently used entry over cache capacity', async () => {
    const service = createMockViewportEventService(3, {
      cacheCapacity: 2,
      datasetFactory: () => [
        createEvent('a', 0.001, 0.001),
        createEvent('b', 1.001, 1.001),
        createEvent('c', 2.001, 2.001),
      ],
    })
    const bboxA: Wgs84Bbox = [0, 0, 0.005, 0.005]
    const bboxB: Wgs84Bbox = [1, 1, 1.005, 1.005]
    const bboxC: Wgs84Bbox = [2, 2, 2.005, 2.005]

    await service.query({ bbox: bboxA, filter: EMPTY_FILTER })
    await service.query({ bbox: bboxB, filter: EMPTY_FILTER })
    expect((await service.query({ bbox: bboxA, filter: EMPTY_FILTER })).cacheHit).toBe(true)
    await service.query({ bbox: bboxC, filter: EMPTY_FILTER })

    expect((await service.query({ bbox: bboxB, filter: EMPTY_FILTER })).cacheHit).toBe(false)
  })

  it('returns arrays that cannot mutate a cached result', async () => {
    const service = createMockViewportEventService(10)
    const first = await service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })
    first.events.length = 0

    const second = await service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })

    expect(second.cacheHit).toBe(true)
    expect(second.events).toHaveLength(10)
  })

  it('clearCache makes the next identical query miss', async () => {
    const service = createMockViewportEventService(10)
    await service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })
    expect((await service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })).cacheHit).toBe(true)

    service.clearCache()

    expect((await service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })).cacheHit).toBe(false)
  })

  it('rejects non-positive cacheCapacity', () => {
    expect(() => createMockViewportEventService(10, { cacheCapacity: 0 })).toThrow(RangeError)
    expect(() => createMockViewportEventService(10, { cacheCapacity: -1 })).toThrow(RangeError)
  })
})

describe('MockViewportEventService cancellation and lifecycle', () => {
  it('rejects an already aborted query with AbortError', async () => {
    const service = createMockViewportEventService(10)
    const controller = new AbortController()
    controller.abort()

    await expect(
      service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('rejects with AbortError when aborted during simulated latency', async () => {
    vi.useFakeTimers()
    const service = createMockViewportEventService(10, { latencyMs: 100 })
    const controller = new AbortController()
    const result = service.query({
      bbox: DATASET_BBOX,
      filter: EMPTY_FILTER,
      signal: controller.signal,
    })

    controller.abort()

    await expect(result).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('rejects new queries after destroy', async () => {
    const service = createMockViewportEventService(10)
    service.destroy()

    await expect(service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })).rejects.toThrow(
      /destroy/iu,
    )
  })

  it('does not cache an aborted query', async () => {
    vi.useFakeTimers()
    const service = createMockViewportEventService(10, { latencyMs: 100 })
    const controller = new AbortController()
    const abortedResult = service.query({
      bbox: DATASET_BBOX,
      filter: EMPTY_FILTER,
      signal: controller.signal,
    })
    controller.abort()
    await expect(abortedResult).rejects.toMatchObject({ name: 'AbortError' })

    const nextResult = service.query({ bbox: DATASET_BBOX, filter: EMPTY_FILTER })
    await vi.advanceTimersByTimeAsync(100)

    expect((await nextResult).cacheHit).toBe(false)
  })
})
