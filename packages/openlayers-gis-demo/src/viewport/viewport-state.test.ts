import { describe, expect, it } from 'vitest'
import type { InspectionEvent } from '../types/inspection-event'
import { mergeViewportQueryState, resetViewportDatasetState } from './viewport-state'
import type { ViewportEventQueryResult, ViewportQueryState } from './types'

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

function createResult(events: InspectionEvent[]): ViewportEventQueryResult {
  return {
    events,
    datasetSize: 100,
    datasetVersion: 1,
    candidateCount: events.length,
    matchedCount: events.length,
    queryDurationMs: 1,
    cacheHit: false,
  }
}

function createQueryState(
  status: ViewportQueryState['status'],
  result: ViewportEventQueryResult | null,
): ViewportQueryState {
  return { status, result, errorMessage: status === 'error' ? '加载失败' : null, requestId: 1 }
}

describe('mergeViewportQueryState', () => {
  it.each(['success', 'empty'] as const)('replaces events for a %s result', (status) => {
    const events = status === 'success' ? [createEvent('new')] : []

    const next = mergeViewportQueryState(
      {
        events: [createEvent('old')],
        selectedEventId: null,
        regionEventIds: null,
        page: 3,
      },
      createQueryState(status, createResult(events)),
    )

    expect(next.events).toEqual(events)
    expect(next.page).toBe(1)
  })

  it('retains prior events when the query errors', () => {
    const priorEvents = [createEvent('old')]

    const next = mergeViewportQueryState(
      { events: priorEvents, selectedEventId: 'old', regionEventIds: ['old'], page: 2 },
      createQueryState('error', createResult(priorEvents)),
    )

    expect(next).toEqual({
      events: priorEvents,
      selectedEventId: 'old',
      regionEventIds: ['old'],
      page: 2,
    })
  })

  it('clears a selected event missing from the new viewport', () => {
    const next = mergeViewportQueryState(
      {
        events: [createEvent('selected')],
        selectedEventId: 'selected',
        regionEventIds: null,
        page: 1,
      },
      createQueryState('success', createResult([createEvent('other')])),
    )

    expect(next.selectedEventId).toBeNull()
  })

  it('intersects region event IDs with the new viewport', () => {
    const next = mergeViewportQueryState(
      {
        events: [createEvent('one'), createEvent('two')],
        selectedEventId: null,
        regionEventIds: ['one', 'two'],
        page: 1,
      },
      createQueryState('success', createResult([createEvent('two'), createEvent('three')])),
    )

    expect(next.regionEventIds).toEqual(['two'])
  })
})

describe('resetViewportDatasetState', () => {
  it('clears events selection region results and pagination', () => {
    expect(
      resetViewportDatasetState(),
    ).toEqual({ events: [], selectedEventId: null, regionEventIds: null, page: 1 })
  })
})
