import { describe, expect, it } from 'vitest'
import {
  createKeyValueStore,
  type CreateKeyValueStoreOptions,
  type KeyValueStore,
} from '@blog/indexed-db'
import type { InspectionEvent } from '../types/inspection-event'
import {
  GIS_EVENT_SHARD_COUNT,
  getEventShardIndex,
  getEventShardKey,
  mergeEventShards,
  partitionEventsByShard,
} from './event-shards'
import { GisDatasetRepository } from './gis-dataset-repository'
import { GisSettingsRepository } from './gis-settings-repository'

function createEvent(id: string): InspectionEvent {
  return {
    id,
    type: 'ROAD_DAMAGE',
    status: 'PENDING',
    level: 'MEDIUM',
    lng: 121.4737,
    lat: 31.2304,
    address: `测试地址 ${id}`,
    createdAt: '2026-10-14T00:00:00.000Z',
  }
}

describe('GIS event shards', () => {
  it('maps representative event IDs to stable shard indexes', () => {
    expect(GIS_EVENT_SHARD_COUNT).toBe(128)
    expect(getEventShardIndex('EVT-000001')).toBe(75)
    expect(getEventShardIndex('导入-甲')).toBe(78)
    expect(getEventShardIndex('😀-event')).toBe(48)
    expect(getEventShardKey(0)).toBe('events:shard:000')
    expect(getEventShardKey(127)).toBe('events:shard:127')
  })

  it('partitions and merges events without losing or duplicating IDs', () => {
    const events = [createEvent('EVT-000001'), createEvent('导入-甲'), createEvent('😀-event')]
    const shards = partitionEventsByShard(events)

    expect(shards).toHaveLength(128)
    expect(mergeEventShards(shards).map(({ id }) => id).sort()).toEqual(
      events.map(({ id }) => id).sort(),
    )
  })
})

let databaseSequence = 0

function createDatabaseName(label: string): string {
  databaseSequence += 1
  return `gis-persistence-test-${label}-${databaseSequence}`
}

describe('GIS persistence initialization', () => {
  it('defaults settings to 10k and restores the last selected scale', async () => {
    const databaseName = createDatabaseName('settings')
    const first = await GisSettingsRepository.create({ databaseName })

    expect(await first.getActiveScale()).toBe('10k')
    await first.setActiveScale('50k')
    first.close()

    const restored = await GisSettingsRepository.create({ databaseName })
    expect(await restored.getActiveScale()).toBe('50k')
    restored.close()
  })

  it('initializes all shards once and restores the persisted dataset on reopen', async () => {
    const databaseName = createDatabaseName('initialize')
    const first = await GisDatasetRepository.create('1k', {
      databaseName,
      now: () => new Date('2026-10-14T01:00:00.000Z'),
    })
    const initialized = await first.loadOrInitialize()

    expect(initialized.metadata).toMatchObject({
      scale: '1k',
      currentEventCount: 1_000,
      fixtureVersion: 1,
      shardCount: 128,
      initializedAt: '2026-10-14T01:00:00.000Z',
      updatedAt: '2026-10-14T01:00:00.000Z',
    })
    expect(initialized.events).toHaveLength(1_000)
    expect(initialized.events[0]?.id).toBe('EVT-000001')
    expect(initialized.regions).toHaveLength(2)
    first.close()

    const reopened = await GisDatasetRepository.create('1k', {
      databaseName,
      now: () => new Date('2026-10-14T02:00:00.000Z'),
    })
    const restored = await reopened.loadOrInitialize()
    expect(restored.metadata.initializedAt).toBe('2026-10-14T01:00:00.000Z')
    expect(restored.events).toEqual(initialized.events)
    reopened.close()
  })

  it('keeps dataset scale namespaces isolated in the same database', async () => {
    const databaseName = createDatabaseName('namespaces')
    const oneThousand = await GisDatasetRepository.create('1k', { databaseName })
    const tenThousand = await GisDatasetRepository.create('10k', { databaseName })

    expect((await oneThousand.loadOrInitialize()).events).toHaveLength(1_000)
    expect((await tenThousand.loadOrInitialize()).events).toHaveLength(10_000)

    oneThousand.close()
    tenThousand.close()
  })

  it('rebuilds the active namespace when the fixture version changes', async () => {
    const databaseName = createDatabaseName('fixture-version')
    const first = await GisDatasetRepository.create('1k', {
      databaseName,
      fixtureVersion: 1,
      now: () => new Date('2026-10-14T01:00:00.000Z'),
    })
    await first.loadOrInitialize()
    first.close()

    const upgraded = await GisDatasetRepository.create('1k', {
      databaseName,
      fixtureVersion: 2,
      now: () => new Date('2026-10-14T02:00:00.000Z'),
    })
    const rebuilt = await upgraded.loadOrInitialize()

    expect(rebuilt.metadata.fixtureVersion).toBe(2)
    expect(rebuilt.metadata.initializedAt).toBe('2026-10-14T02:00:00.000Z')
    expect(rebuilt.events).toHaveLength(1_000)
    upgraded.close()
  })

  it('retries a complete initialization after an atomic batch failure', async () => {
    const databaseName = createDatabaseName('retry')
    let failNextBatch = true
    const storeFactory = async (options: CreateKeyValueStoreOptions): Promise<KeyValueStore> => {
      const store = await createKeyValueStore(options)
      return {
        ...store,
        get state() {
          return store.state
        },
        get: store.get.bind(store),
        set: store.set.bind(store),
        has: store.has.bind(store),
        delete: store.delete.bind(store),
        keys: store.keys.bind(store),
        entries: store.entries.bind(store),
        async setMany(entries) {
          if (failNextBatch) {
            failNextBatch = false
            throw new Error('模拟原子批写失败')
          }
          await store.setMany(entries)
        },
        deleteMany: store.deleteMany.bind(store),
        clear: store.clear.bind(store),
        close: store.close.bind(store),
      }
    }
    const repository = await GisDatasetRepository.create('1k', {
      databaseName,
      storeFactory,
    })

    await expect(repository.loadOrInitialize()).rejects.toThrow('模拟原子批写失败')
    const retried = await repository.loadOrInitialize()

    expect(retried.metadata.currentEventCount).toBe(1_000)
    expect(retried.events).toHaveLength(1_000)
    repository.close()
  })
})

describe('GIS persisted business mutations', () => {
  it('adds and edits an event without changing its identity or double-counting it', async () => {
    const databaseName = createDatabaseName('single-mutation')
    const repository = await GisDatasetRepository.create('1k', {
      databaseName,
      now: () => new Date('2026-10-14T03:00:00.000Z'),
    })
    await repository.loadOrInitialize()
    const addedEvent = createEvent('USER-000001')

    expect(await repository.addEvent(addedEvent)).toBe(true)
    expect(await repository.addEvent(addedEvent)).toBe(false)
    expect(
      await repository.updateEvent(addedEvent.id, {
        type: 'LIGHT_FAILURE',
        level: 'HIGH',
        lng: 121.5,
        lat: 31.2,
        address: '用户编辑后的地址',
      }),
    ).toMatchObject({
      id: addedEvent.id,
      status: 'PENDING',
      type: 'LIGHT_FAILURE',
      level: 'HIGH',
      address: '用户编辑后的地址',
    })
    repository.close()

    const reopened = await GisDatasetRepository.create('1k', { databaseName })
    const restored = await reopened.loadOrInitialize()
    expect(restored.metadata.currentEventCount).toBe(1_001)
    expect(restored.events.find(({ id }) => id === addedEvent.id)).toMatchObject({
      type: 'LIGHT_FAILURE',
      address: '用户编辑后的地址',
    })
    reopened.close()
  })

  it('persists assignee, monotonic activities, status transitions, and regions', async () => {
    const databaseName = createDatabaseName('business-details')
    let timestampHour = 4
    const repository = await GisDatasetRepository.create('1k', {
      databaseName,
      now: () => new Date(`2026-10-14T${String(timestampHour++).padStart(2, '0')}:00:00.000Z`),
    })
    const initialized = await repository.loadOrInitialize()
    const targetEvent = initialized.events.find(({ status }) => status === 'PENDING')!
    const targetId = targetEvent.id

    expect(await repository.setAssignee(targetId, '  张工  ')).toBe(true)
    expect((await repository.advanceEventStatus(targetId))?.status).toBe('PROCESSING')
    expect((await repository.advanceEventStatus(targetId))?.status).toBe('DONE')
    expect(await repository.advanceEventStatus(targetId)).toBeNull()
    const region = {
      id: 'REGION-USER-1',
      name: '用户区域',
      geometry: {
        type: 'Circle' as const,
        center: [121.4737, 31.2304] as const,
        radiusMeters: 500,
      },
      eventIds: [targetId],
      createdAt: '2026-10-14T04:00:00.000Z',
    }
    await repository.saveRegions([region])
    repository.close()

    const reopened = await GisDatasetRepository.create('1k', { databaseName })
    const restored = await reopened.loadOrInitialize()
    const details = await reopened.loadEventDetails(targetId)
    expect(restored.events.find(({ id }) => id === targetId)?.status).toBe('DONE')
    expect(restored.regions).toEqual([region])
    expect(details.assignee).toBe('张工')
    expect(details.activities.map(({ id }) => id)).toEqual([
      `${targetId}-activity-1`,
      `${targetId}-activity-2`,
      `${targetId}-activity-3`,
    ])
    reopened.close()
  })

  it('advances matching events across shards in one persisted operation', async () => {
    const databaseName = createDatabaseName('batch-status')
    const repository = await GisDatasetRepository.create('1k', { databaseName })
    const initialized = await repository.loadOrInitialize()
    const targetIds = initialized.events
      .filter(({ status }) => status === 'PENDING')
      .slice(0, 3)
      .map(({ id }) => id)

    const updated = await repository.advanceEventStatuses(targetIds, 'PENDING')
    expect(updated).toHaveLength(3)
    repository.close()

    const reopened = await GisDatasetRepository.create('1k', { databaseName })
    const restored = await reopened.loadOrInitialize()
    expect(
      restored.events
        .filter(({ id }) => targetIds.includes(id))
        .every(({ status }) => status === 'PROCESSING'),
    ).toBe(true)
    reopened.close()
  })

  it('cascades event deletion through regions, details, attachment metadata, and Blob tombstones', async () => {
    const databaseName = createDatabaseName('delete-cascade')
    const repository = await GisDatasetRepository.create('1k', { databaseName })
    await repository.loadOrInitialize()
    const event = createEvent('USER-DELETE-1')
    await repository.addEvent(event)
    await repository.setAssignee(event.id, '李工')
    await repository.saveRegions([
      {
        id: 'REGION-DELETE-1',
        name: '删除级联区域',
        geometry: { type: 'Circle', center: [121.4737, 31.2304], radiusMeters: 300 },
        eventIds: [event.id, 'EVT-000001'],
        createdAt: '2026-10-14T06:00:00.000Z',
      },
    ])
    const firstAttachment = {
      id: 'ATTACHMENT-1',
      name: 'before.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 6,
      addedAt: '2026-10-14T06:00:00.000Z',
    }
    const secondAttachment = { ...firstAttachment, id: 'ATTACHMENT-2', name: 'after.jpg' }
    await repository.addAttachment(event.id, firstAttachment, new Blob(['before']))
    await repository.addAttachment(event.id, secondAttachment, new Blob(['after!']))
    expect(await repository.removeAttachment(event.id, firstAttachment.id)).toBe(true)
    expect(await repository.loadAttachmentBlob(event.id, firstAttachment.id)).toBeNull()

    expect(await repository.removeEvent(event.id)).toBe(true)
    repository.close()

    const reopened = await GisDatasetRepository.create('1k', { databaseName })
    const restored = await reopened.loadOrInitialize()
    expect(restored.metadata.currentEventCount).toBe(1_000)
    expect(restored.events.some(({ id }) => id === event.id)).toBe(false)
    expect(restored.regions[0]?.eventIds).toEqual(['EVT-000001'])
    expect(await reopened.loadEventDetails(event.id)).toEqual({
      assignee: null,
      activities: [],
      attachments: [],
    })
    expect(await reopened.loadAttachmentBlob(event.id, secondAttachment.id)).toBeNull()
    reopened.close()
  })

  it('does not commit an in-memory event snapshot when persistence fails', async () => {
    const databaseName = createDatabaseName('mutation-failure')
    let rejectBatch = false
    const storeFactory = async (options: CreateKeyValueStoreOptions): Promise<KeyValueStore> => {
      const store = await createKeyValueStore(options)
      return {
        get state() {
          return store.state
        },
        get: store.get.bind(store),
        set: store.set.bind(store),
        has: store.has.bind(store),
        delete: store.delete.bind(store),
        keys: store.keys.bind(store),
        entries: store.entries.bind(store),
        async setMany(entries) {
          if (rejectBatch) throw new Error('模拟业务批写失败')
          await store.setMany(entries)
        },
        deleteMany: store.deleteMany.bind(store),
        clear: store.clear.bind(store),
        close: store.close.bind(store),
      }
    }
    const repository = await GisDatasetRepository.create('1k', { databaseName, storeFactory })
    const before = await repository.loadOrInitialize()
    rejectBatch = true

    await expect(repository.addEvent(createEvent('USER-FAIL-1'))).rejects.toThrow(
      '模拟业务批写失败',
    )
    const after = await repository.loadOrInitialize()
    expect(after.metadata.currentEventCount).toBe(before.metadata.currentEventCount)
    expect(after.events).toEqual(before.events)
    repository.close()
  })
})
