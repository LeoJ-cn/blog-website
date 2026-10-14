import {
  createKeyValueStore,
  type CreateKeyValueStoreOptions,
  type KeyValueStore,
  type StorageRuntimeState,
} from '@blog/indexed-db'
import { generateInspectionEvents } from '../mock/generate-events'
import { mockInspectionRegions } from '../mock/regions'
import type { InspectionEvent } from '../types/inspection-event'
import type { InspectionRegion } from '../types/region'
import { getDatasetSize, type GisDatasetScale } from './dataset-scale'
import {
  GIS_EVENT_SHARD_COUNT,
  getEventShardKey,
  mergeEventShards,
  partitionEventsByShard,
} from './event-shards'
import type { GisDatasetMetadata, PersistedGisDataset } from './types'

const DEFAULT_DATABASE_NAME = 'blog-gis'
const METADATA_KEY = 'metadata'
const REGIONS_KEY = 'regions'

export const GIS_FIXTURE_VERSION = 1

type StoreFactory = (options: CreateKeyValueStoreOptions) => Promise<KeyValueStore>

export interface GisDatasetRepositoryOptions {
  /** 生产固定为 blog-gis；测试可传独立名称隔离页面级 Memory Registry。 */
  databaseName?: string
  /** 注入时间只用于得到可复现的 metadata 测试，不改变生产时钟语义。 */
  now?: () => Date
  /** 测试可模拟未来 fixture 版本；生产必须使用 GIS_FIXTURE_VERSION。 */
  fixtureVersion?: number
  storeFactory?: StoreFactory
  onRuntimeStateChange?: CreateKeyValueStoreOptions['onRuntimeStateChange']
}

export class GisDatasetRepository {
  readonly #scale: GisDatasetScale
  readonly #store: KeyValueStore
  readonly #now: () => Date
  readonly #fixtureVersion: number

  private constructor(
    scale: GisDatasetScale,
    store: KeyValueStore,
    options: GisDatasetRepositoryOptions,
  ) {
    this.#scale = scale
    this.#store = store
    this.#now = options.now ?? (() => new Date())
    this.#fixtureVersion = options.fixtureVersion ?? GIS_FIXTURE_VERSION
  }

  static async create(
    scale: GisDatasetScale,
    options: GisDatasetRepositoryOptions = {},
  ): Promise<GisDatasetRepository> {
    const storeFactory = options.storeFactory ?? createKeyValueStore
    const store = await storeFactory({
      databaseName: options.databaseName ?? DEFAULT_DATABASE_NAME,
      namespace: `dataset:${scale}`,
      fallback: 'memory',
      onRuntimeStateChange: options.onRuntimeStateChange,
    })
    return new GisDatasetRepository(scale, store, options)
  }

  get state(): StorageRuntimeState {
    return this.#store.state
  }

  async loadOrInitialize(): Promise<PersistedGisDataset> {
    const metadata = await this.#store.get<GisDatasetMetadata>(METADATA_KEY)
    if (metadata && this.#isCurrentMetadata(metadata)) {
      const restored = await this.#restore(metadata)
      if (restored) return restored
    }
    return this.#initialize()
  }

  close(): void {
    this.#store.close()
  }

  #isCurrentMetadata(metadata: GisDatasetMetadata): boolean {
    return (
      metadata.scale === this.#scale &&
      metadata.fixtureVersion === this.#fixtureVersion &&
      metadata.shardCount === GIS_EVENT_SHARD_COUNT
    )
  }

  async #restore(metadata: GisDatasetMetadata): Promise<PersistedGisDataset | null> {
    const shards = await Promise.all(
      Array.from({ length: GIS_EVENT_SHARD_COUNT }, (_, index) =>
        this.#store.get<InspectionEvent[]>(getEventShardKey(index)),
      ),
    )
    const regions = await this.#store.get<InspectionRegion[]>(REGIONS_KEY)
    if (shards.some((shard) => !Array.isArray(shard)) || !Array.isArray(regions)) return null

    return {
      metadata,
      events: mergeEventShards(shards as InspectionEvent[][]),
      regions,
      storageState: this.state,
    }
  }

  async #initialize(): Promise<PersistedGisDataset> {
    // 先清空失效版本；后续 setMany 将 metadata 与全部 shard 同批提交，失败时不会留下完成标记。
    await this.#store.clear()
    const events = generateInspectionEvents(getDatasetSize(this.#scale))
    const shards = partitionEventsByShard(events)
    const timestamp = this.#now().toISOString()
    const metadata: GisDatasetMetadata = {
      scale: this.#scale,
      currentEventCount: events.length,
      fixtureVersion: this.#fixtureVersion,
      shardCount: GIS_EVENT_SHARD_COUNT,
      initializedAt: timestamp,
      updatedAt: timestamp,
    }
    const regions = structuredClone(mockInspectionRegions)
    await this.#store.setMany([
      [METADATA_KEY, metadata],
      [REGIONS_KEY, regions],
      ...shards.map((shard, index) => [getEventShardKey(index), shard] as const),
    ])
    return { metadata, events, regions, storageState: this.state }
  }
}
