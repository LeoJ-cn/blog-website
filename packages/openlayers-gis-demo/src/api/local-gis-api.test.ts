import { describe, expect, it } from 'vitest'
import type { InspectionEvent, InspectionEventFilter } from '../types/inspection-event'
import type { Wgs84Bbox } from '../viewport/types'
import { LocalGisApi } from './local-gis-api'

const EMPTY_FILTER: InspectionEventFilter = {
  keyword: '',
  type: null,
  status: null,
  level: null,
}
const TEST_BBOX: Wgs84Bbox = [121.46, 31.22, 121.49, 31.25]

function createEvent(id: string, overrides: Partial<InspectionEvent> = {}): InspectionEvent {
  return {
    id,
    type: 'ROAD_DAMAGE',
    status: 'PENDING',
    level: 'MEDIUM',
    lng: 121.4737,
    lat: 31.2304,
    address: `测试地址 ${id}`,
    createdAt: '2026-10-14T00:00:00.000Z',
    ...overrides,
  }
}

describe('LocalGisApi', () => {
  it('builds its viewport index from persistence and invalidates stale caches after mutations', async () => {
    const api = await LocalGisApi.create('1k', {
      databaseName: 'local-gis-api-mutations',
      latencyMs: 0,
    })
    const initial = await api.queryViewport({ bbox: TEST_BBOX, filter: EMPTY_FILTER })
    expect(api.state).toMatchObject({ datasetScale: '1k', datasetSize: 1_000, closed: false })
    expect(initial.datasetSize).toBe(1_000)
    expect((await api.queryViewport({ bbox: TEST_BBOX, filter: EMPTY_FILTER })).cacheHit).toBe(true)

    const added = createEvent('LOCAL-API-1')
    expect(await api.addEvent(added)).toBe(true)
    const afterAdd = await api.queryViewport({ bbox: TEST_BBOX, filter: EMPTY_FILTER })
    expect(afterAdd.cacheHit).toBe(false)
    expect(afterAdd.events.some(({ id }) => id === added.id)).toBe(true)

    expect(
      await api.importEvents([createEvent(added.id, { lng: 0, lat: 0, address: '已移出视口' })]),
    ).toEqual({ addedCount: 0, overwrittenCount: 1 })
    expect(
      (await api.queryViewport({ bbox: TEST_BBOX, filter: EMPTY_FILTER })).events.some(
        ({ id }) => id === added.id,
      ),
    ).toBe(false)

    expect(await api.removeEvent(added.id)).toBe(true)
    expect(api.state.datasetSize).toBe(1_000)
    api.close()
    expect(api.state.closed).toBe(true)
    await expect(api.queryViewport({ bbox: TEST_BBOX, filter: EMPTY_FILTER })).rejects.toThrow(
      /closed/iu,
    )
  })
})
