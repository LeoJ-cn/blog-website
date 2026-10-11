import { describe, expect, it } from 'vitest'
import type { InspectionEvent, InspectionEventFilter } from '../types/inspection-event'
import { ViewportQueryController } from './viewport-query-controller'
import type {
  ViewportDatasetBuildStats,
  ViewportEventQuery,
  ViewportEventQueryResult,
  ViewportEventService,
  ViewportQueryState,
  Wgs84Bbox,
} from './types'

const EMPTY_FILTER: InspectionEventFilter = {
  keyword: '',
  type: null,
  status: null,
  level: null,
}
const DEFAULT_BBOX: Wgs84Bbox = [121.4, 31.15, 121.55, 31.3]

function createEvent(id: string): InspectionEvent {
  return {
    id,
    type: 'ROAD_DAMAGE',
    status: 'PENDING',
    level: 'MEDIUM',
    lng: 121.47,
    lat: 31.23,
    address: `测试地址 ${id}`,
    createdAt: '2026-10-11T00:00:00.000Z',
  }
}

function createResult(
  events: InspectionEvent[],
  datasetVersion = 1,
): ViewportEventQueryResult {
  return {
    events,
    datasetSize: 100,
    datasetVersion,
    candidateCount: events.length,
    matchedCount: events.length,
    queryDurationMs: 1,
    cacheHit: false,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

class ControlledViewportEventService implements ViewportEventService {
  readonly queries: ViewportEventQuery[] = []

  constructor(
    private readonly queryHandler: (query: ViewportEventQuery, index: number) => Promise<ViewportEventQueryResult>,
  ) {}

  setDatasetSize(): ViewportDatasetBuildStats {
    throw new Error('该测试不使用数据集重建')
  }

  query(query: ViewportEventQuery): Promise<ViewportEventQueryResult> {
    this.queries.push(query)
    return this.queryHandler(query, this.queries.length - 1)
  }

  clearCache(): void {}

  destroy(): void {}
}

describe('ViewportQueryController states and cancellation', () => {
  it('emits loading before a successful result', async () => {
    const states: ViewportQueryState[] = []
    const service = new ControlledViewportEventService(async () => createResult([createEvent('one')]))
    const controller = new ViewportQueryController({
      service,
      onStateChange: (state) => states.push(state),
    })

    await controller.query({
      bbox: DEFAULT_BBOX,
      filter: EMPTY_FILTER,
      expectedDatasetVersion: 1,
    })

    expect(states.map(({ status }) => status)).toEqual(['loading', 'success'])
    expect(states.at(-1)?.result?.events.map(({ id }) => id)).toEqual(['one'])
    expect(states.every(Object.isFrozen)).toBe(true)
  })

  it('emits empty when the latest result has no events', async () => {
    const states: ViewportQueryState[] = []
    const controller = new ViewportQueryController({
      service: new ControlledViewportEventService(async () => createResult([])),
      onStateChange: (state) => states.push(state),
    })

    await controller.query({
      bbox: DEFAULT_BBOX,
      filter: EMPTY_FILTER,
      expectedDatasetVersion: 1,
    })

    expect(states.at(-1)?.status).toBe('empty')
  })

  it('aborts the prior signal and prevents a late response from replacing the latest result', async () => {
    const first = createDeferred<ViewportEventQueryResult>()
    const second = createDeferred<ViewportEventQueryResult>()
    const states: ViewportQueryState[] = []
    const service = new ControlledViewportEventService((_query, index) =>
      index === 0 ? first.promise : second.promise,
    )
    const controller = new ViewportQueryController({
      service,
      onStateChange: (state) => states.push(state),
    })
    const firstQuery = controller.query({
      bbox: DEFAULT_BBOX,
      filter: EMPTY_FILTER,
      expectedDatasetVersion: 1,
    })
    const secondQuery = controller.query({
      bbox: [121.45, 31.2, 121.5, 31.25],
      filter: EMPTY_FILTER,
      expectedDatasetVersion: 1,
    })

    expect(service.queries[0]?.signal?.aborted).toBe(true)
    second.resolve(createResult([createEvent('latest')]))
    await secondQuery
    first.resolve(createResult([createEvent('stale')]))
    await firstQuery

    expect(states.at(-1)?.result?.events.map(({ id }) => id)).toEqual(['latest'])
    expect(states.filter(({ status }) => status === 'success')).toHaveLength(1)
  })

  it('cancel restores the prior successful result without emitting an error', async () => {
    const pending = createDeferred<ViewportEventQueryResult>()
    const states: ViewportQueryState[] = []
    const service = new ControlledViewportEventService((_query, index) =>
      index === 0 ? Promise.resolve(createResult([createEvent('stable')])) : pending.promise,
    )
    const controller = new ViewportQueryController({
      service,
      onStateChange: (state) => states.push(state),
    })
    await controller.query({
      bbox: DEFAULT_BBOX,
      filter: EMPTY_FILTER,
      expectedDatasetVersion: 1,
    })
    void controller.query({
      bbox: [121.45, 31.2, 121.5, 31.25],
      filter: EMPTY_FILTER,
      expectedDatasetVersion: 1,
    })

    controller.cancel()

    expect(service.queries[1]?.signal?.aborted).toBe(true)
    expect(states.at(-1)).toMatchObject({ status: 'success', errorMessage: null })
    expect(states.at(-1)?.result?.events.map(({ id }) => id)).toEqual(['stable'])
  })

  it('emits a safe error while retaining the prior successful result', async () => {
    const states: ViewportQueryState[] = []
    const service = new ControlledViewportEventService((_query, index) =>
      index === 0
        ? Promise.resolve(createResult([createEvent('stable')]))
        : Promise.reject(new Error('sensitive backend detail')),
    )
    const controller = new ViewportQueryController({
      service,
      onStateChange: (state) => states.push(state),
    })
    const params = { bbox: DEFAULT_BBOX, filter: EMPTY_FILTER, expectedDatasetVersion: 1 }
    await controller.query(params)
    await controller.query(params)

    expect(states.at(-1)).toMatchObject({
      status: 'error',
      errorMessage: '当前视口数据加载失败，请重试',
    })
    expect(states.at(-1)?.result?.events.map(({ id }) => id)).toEqual(['stable'])
  })
})

describe('ViewportQueryController race and dataset version guards', () => {
  it('does not commit a result from a different dataset version', async () => {
    const states: ViewportQueryState[] = []
    const controller = new ViewportQueryController({
      service: new ControlledViewportEventService(async () =>
        createResult([createEvent('wrong-version')], 2),
      ),
      onStateChange: (state) => states.push(state),
    })

    await controller.query({
      bbox: DEFAULT_BBOX,
      filter: EMPTY_FILTER,
      expectedDatasetVersion: 1,
    })

    expect(states.map(({ status }) => status)).toEqual(['loading'])
  })

  it('does not emit after destroy even if an in-flight service resolves', async () => {
    const deferred = createDeferred<ViewportEventQueryResult>()
    const states: ViewportQueryState[] = []
    const controller = new ViewportQueryController({
      service: new ControlledViewportEventService(() => deferred.promise),
      onStateChange: (state) => states.push(state),
    })
    const query = controller.query({
      bbox: DEFAULT_BBOX,
      filter: EMPTY_FILTER,
      expectedDatasetVersion: 1,
    })
    controller.destroy()
    deferred.resolve(createResult([createEvent('late')]))
    await query

    expect(states.map(({ status }) => status)).toEqual(['loading'])
  })
})

describe('ViewportQueryController retry', () => {
  it('retries with a snapshot of the last bbox filter and dataset version', async () => {
    const states: ViewportQueryState[] = []
    const filter: InspectionEventFilter = { ...EMPTY_FILTER, keyword: 'original' }
    const service = new ControlledViewportEventService((query, index) => {
      if (index === 0) return Promise.reject(new Error('temporary'))
      return Promise.resolve(
        createResult([createEvent(`${query.bbox[0]}:${query.filter.keyword}`)], 7),
      )
    })
    const controller = new ViewportQueryController({
      service,
      onStateChange: (state) => states.push(state),
    })
    const bbox: Wgs84Bbox = [121.41, 31.16, 121.51, 31.26]
    await controller.query({ bbox, filter, expectedDatasetVersion: 7 })
    filter.keyword = 'mutated'
    await controller.retry()

    expect(states.at(-1)?.result?.events[0]?.id).toBe('121.41:original')
  })

  it('does not call the service when retry has no prior query', async () => {
    const service = new ControlledViewportEventService(async () => createResult([]))
    const controller = new ViewportQueryController({ service, onStateChange: () => undefined })

    await controller.retry()

    expect(service.queries).toHaveLength(0)
  })
})
