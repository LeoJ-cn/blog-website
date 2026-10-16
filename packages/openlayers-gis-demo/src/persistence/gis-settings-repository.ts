import {
  createKeyValueStore,
  type CreateKeyValueStoreOptions,
  type KeyValueStore,
  type StorageRuntimeState,
} from '@white55/indexed-db'
import {
  DEFAULT_GIS_DATASET_SCALE,
  isGisDatasetScale,
  type GisDatasetScale,
} from './dataset-scale'

const DEFAULT_DATABASE_NAME = 'blog-gis'
const SETTINGS_NAMESPACE = 'settings'
const ACTIVE_SCALE_KEY = 'active-scale'

type StoreFactory = (options: CreateKeyValueStoreOptions) => Promise<KeyValueStore>

export interface GisSettingsRepositoryOptions {
  /** 生产固定为 blog-gis；测试可传独立名称隔离页面级 Memory Registry。 */
  databaseName?: string
  storeFactory?: StoreFactory
  onRuntimeStateChange?: CreateKeyValueStoreOptions['onRuntimeStateChange']
}

export class GisSettingsRepository {
  readonly #store: KeyValueStore

  private constructor(store: KeyValueStore) {
    this.#store = store
  }

  static async create(options: GisSettingsRepositoryOptions = {}): Promise<GisSettingsRepository> {
    const storeFactory = options.storeFactory ?? createKeyValueStore
    const store = await storeFactory({
      databaseName: options.databaseName ?? DEFAULT_DATABASE_NAME,
      namespace: SETTINGS_NAMESPACE,
      fallback: 'memory',
      onRuntimeStateChange: options.onRuntimeStateChange,
    })
    return new GisSettingsRepository(store)
  }

  get state(): StorageRuntimeState {
    return this.#store.state
  }

  async getActiveScale(): Promise<GisDatasetScale> {
    const value = await this.#store.get<unknown>(ACTIVE_SCALE_KEY)
    return isGisDatasetScale(value) ? value : DEFAULT_GIS_DATASET_SCALE
  }

  async setActiveScale(scale: GisDatasetScale): Promise<void> {
    await this.#store.set(ACTIVE_SCALE_KEY, scale)
  }

  close(): void {
    this.#store.close()
  }
}
