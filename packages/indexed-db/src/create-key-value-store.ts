import { KeyValueStorageError, toKeyValueStorageError } from './errors'
import {
  openIndexedDbKeyValueStore,
  type NormalizedCreateKeyValueStoreOptions,
} from './indexed-db/indexed-db-key-value-store'
import { normalizeDatabaseName, normalizeNamespace } from './internal/key'
import { createMemoryKeyValueStore } from './memory/memory-key-value-store'
import type {
  CreateKeyValueStoreOptions,
  KeyValueStore,
  StorageErrorCode,
  StorageRuntimeState,
} from './types'

class ResilientKeyValueStore implements KeyValueStore {
  readonly #options: NormalizedCreateKeyValueStoreOptions
  #adapter: KeyValueStore
  #onRuntimeStateChange?: (state: StorageRuntimeState) => void
  #closed = false

  constructor(
    options: NormalizedCreateKeyValueStoreOptions,
    adapter: KeyValueStore,
    onRuntimeStateChange?: (state: StorageRuntimeState) => void,
  ) {
    this.#options = options
    this.#adapter = adapter
    this.#onRuntimeStateChange = onRuntimeStateChange
  }

  get state(): StorageRuntimeState {
    return this.#adapter.state
  }

  get<Value>(key: string): Promise<Value | undefined> {
    return this.#adapter.get<Value>(key)
  }

  set<Value>(key: string, value: Value): Promise<void> {
    return this.#adapter.set(key, value)
  }

  has(key: string): Promise<boolean> {
    return this.#adapter.has(key)
  }

  delete(key: string): Promise<void> {
    return this.#adapter.delete(key)
  }

  keys(options?: { prefix?: string }): Promise<string[]> {
    return this.#adapter.keys(options)
  }

  entries<Value>(options?: { prefix?: string }): Promise<Array<readonly [string, Value]>> {
    return this.#adapter.entries<Value>(options)
  }

  setMany(entries: ReadonlyArray<readonly [string, unknown]>): Promise<void> {
    return this.#adapter.setMany(entries)
  }

  deleteMany(keys: readonly string[]): Promise<void> {
    return this.#adapter.deleteMany(keys)
  }

  clear(options?: { prefix?: string }): Promise<void> {
    return this.#adapter.clear(options)
  }

  switchToMemory(reason: StorageErrorCode): void {
    if (this.#closed || this.#adapter.state.engine === 'memory') return
    this.#adapter.close()
    this.#adapter = createMemoryKeyValueStore(this.#options, reason)
    this.#notifyStateChange()
  }

  close(): void {
    if (this.#closed) return
    this.#closed = true
    this.#adapter.close()
    this.#onRuntimeStateChange = undefined
  }

  #notifyStateChange(): void {
    const callback = this.#onRuntimeStateChange
    if (!callback) return
    try {
      callback(Object.freeze({ ...this.state }))
    } catch {
      // 观察者异常不能破坏已经完成的存储引擎切换。
    }
  }
}

export async function createKeyValueStore(
  options: CreateKeyValueStoreOptions,
): Promise<KeyValueStore> {
  if (options.fallback !== 'memory') {
    throw new KeyValueStorageError('UNKNOWN', '当前只支持 memory 降级策略')
  }

  const normalizedOptions: NormalizedCreateKeyValueStoreOptions = {
    databaseName: normalizeDatabaseName(options.databaseName),
    namespace: normalizeNamespace(options.namespace),
  }
  const createMemoryFacade = (reason: StorageErrorCode) => {
    const facade = new ResilientKeyValueStore(
      normalizedOptions,
      createMemoryKeyValueStore(normalizedOptions, reason),
      options.onRuntimeStateChange,
    )
    notifyInitialState(options.onRuntimeStateChange, facade.state)
    return facade
  }

  if (!globalThis.indexedDB) return createMemoryFacade('INDEXED_DB_UNSUPPORTED')

  let facade: ResilientKeyValueStore | null = null
  let pendingFallbackReason: StorageErrorCode | null = null
  const requestFallback = (reason: StorageErrorCode) => {
    if (facade) facade.switchToMemory(reason)
    else pendingFallbackReason = reason
  }

  try {
    const indexedDbStore = await openIndexedDbKeyValueStore(normalizedOptions, {
      onBlocked: () => requestFallback('OPEN_BLOCKED'),
      onTerminated: () => requestFallback('CONNECTION_TERMINATED'),
    })
    if (pendingFallbackReason) {
      indexedDbStore.close()
      return createMemoryFacade(pendingFallbackReason)
    }

    facade = new ResilientKeyValueStore(
      normalizedOptions,
      indexedDbStore,
      options.onRuntimeStateChange,
    )
    notifyInitialState(options.onRuntimeStateChange, facade.state)
    return facade
  } catch (error) {
    const storageError = toKeyValueStorageError(error)
    if (!canFallbackFromOpenError(storageError.code)) throw storageError
    return createMemoryFacade(storageError.code)
  }
}

function canFallbackFromOpenError(code: StorageErrorCode): boolean {
  // AbortError 在打开或升级数据库阶段表示连接未能建立，并非调用方的数据操作失败；
  // 此时还没有可继续使用的持久化 Adapter，应按“打开失败”语义进入 Memory。
  return (
    code === 'INDEXED_DB_UNSUPPORTED' ||
    code === 'OPEN_BLOCKED' ||
    code === 'CONNECTION_TERMINATED' ||
    code === 'TRANSACTION_ABORTED' ||
    code === 'UNKNOWN'
  )
}

function notifyInitialState(
  callback: CreateKeyValueStoreOptions['onRuntimeStateChange'],
  state: StorageRuntimeState,
): void {
  if (!callback) return
  try {
    callback(Object.freeze({ ...state }))
  } catch {
    // 状态观察者属于调用方，不能让其异常改变 Store 创建结果。
  }
}
