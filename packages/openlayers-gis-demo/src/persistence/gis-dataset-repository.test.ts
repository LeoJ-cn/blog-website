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
