import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { describe, expect, it } from 'vitest'
import type { EventLevel, EventStatus, EventType, InspectionEvent } from '../../types/inspection-event'
import { createEventSource } from './create-event-source'
import { syncEventSource } from './sync-event-source'

function createEvent(id: string, overrides: Partial<InspectionEvent> = {}): InspectionEvent {
  return {
    id,
    type: 'ROAD_DAMAGE',
    status: 'PENDING',
    level: 'MEDIUM',
    lng: 121.47,
    lat: 31.23,
    address: `测试地址 ${id}`,
    createdAt: '2026-10-11T00:00:00.000Z',
    ...overrides,
  }
}

describe('syncEventSource diff counters and identity', () => {
  it('adds two events to an empty source', () => {
    const source = createEventSource()

    const stats = syncEventSource(source, [createEvent('one'), createEvent('two')])

    expect(stats).toMatchObject({ added: 2, updated: 0, removed: 0, unchanged: 0 })
    expect(source.getFeatures()).toHaveLength(2)
  })

  it('removes an event that leaves the viewport', () => {
    const source = createEventSource([createEvent('one'), createEvent('two')])

    const stats = syncEventSource(source, [createEvent('two')])

    expect(stats).toMatchObject({ added: 0, updated: 0, removed: 1, unchanged: 1 })
    expect(source.getFeatureById('one')).toBeNull()
  })

  it('keeps the same feature object for an unchanged event', () => {
    const event = createEvent('one')
    const source = createEventSource([event])
    const originalFeature = source.getFeatureById('one')

    const stats = syncEventSource(source, [{ ...event }])

    expect(stats).toMatchObject({ added: 0, updated: 0, removed: 0, unchanged: 1 })
    expect(source.getFeatureById('one')).toBe(originalFeature)
  })

  it.each<{
    label: string
    overrides: Partial<InspectionEvent>
  }>([
    { label: 'status', overrides: { status: 'DONE' satisfies EventStatus } },
    { label: 'type', overrides: { type: 'MANHOLE' satisfies EventType } },
    { label: 'level', overrides: { level: 'HIGH' satisfies EventLevel } },
    { label: 'longitude', overrides: { lng: 121.48 } },
    { label: 'latitude', overrides: { lat: 31.24 } },
  ])('updates $label in place while retaining feature identity', ({ overrides }) => {
    const source = createEventSource([createEvent('one')])
    const originalFeature = source.getFeatureById('one')

    const stats = syncEventSource(source, [createEvent('one', overrides)])

    expect(stats).toMatchObject({ added: 0, updated: 1, removed: 0, unchanged: 0 })
    expect(source.getFeatureById('one')).toBe(originalFeature)
  })

  it('counts a mixed add update remove and unchanged batch', () => {
    const source = createEventSource([
      createEvent('removed'),
      createEvent('updated'),
      createEvent('unchanged'),
    ])

    const stats = syncEventSource(source, [
      createEvent('updated', { status: 'DONE' }),
      createEvent('unchanged'),
      createEvent('added'),
    ])

    expect(stats).toMatchObject({ added: 1, updated: 1, removed: 1, unchanged: 1 })
    expect(stats.added + stats.updated + stats.removed + stats.unchanged).toBe(4)
  })
})

describe('syncEventSource selection and invalid identities', () => {
  it('reports a selected event removed by the diff', () => {
    const source = createEventSource([createEvent('selected')])

    const stats = syncEventSource(source, [], 'selected')

    expect(stats.removedSelectedEventId).toBe('selected')
  })

  it('does not invalidate a selected event that remains', () => {
    const source = createEventSource([createEvent('selected')])

    const stats = syncEventSource(source, [createEvent('selected')], 'selected')

    expect(stats.removedSelectedEventId).toBeNull()
  })

  it('rejects duplicate IDs in the new result', () => {
    const source = createEventSource()

    expect(() => syncEventSource(source, [createEvent('duplicate'), createEvent('duplicate')])).toThrow(
      /duplicate/iu,
    )
  })

  it('removes an old feature without a string ID instead of updating it', () => {
    const source = createEventSource()
    const invalidFeature = new Feature<Point>({ geometry: new Point([0, 0]) })
    source.addFeature(invalidFeature)

    const stats = syncEventSource(source, [])

    expect(stats).toMatchObject({ added: 0, updated: 0, removed: 1, unchanged: 0 })
    expect(source.getFeatures()).toHaveLength(0)
  })
})
