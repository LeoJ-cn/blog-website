import { KeyValueStorageError } from '../errors'
import { cloneStoredValue } from '../internal/clone'
import {
  fromInternalKey,
  normalizeDatabaseName,
  normalizeNamespace,
  toInternalKey,
  toNamespacePrefix,
} from '../internal/key'
import type {
  CreateKeyValueStoreOptions,
  KeyValueStore,
  StorageErrorCode,
  StorageRuntimeState,
} from '../types'
import { getMemoryDatabase } from './memory-registry'

type MemoryStoreOptions = Pick<CreateKeyValueStoreOptions, 'databaseName' | 'namespace'>

class MemoryKeyValueStore implements KeyValueStore {
  readonly state: StorageRuntimeState

  readonly #database: Map<string, unknown>
  readonly #namespace: string
  #closed = false

  constructor(options: MemoryStoreOptions, fallbackReason: StorageErrorCode) {
    const databaseName = normalizeDatabaseName(options.databaseName)
    this.#namespace = normalizeNamespace(options.namespace)
    this.#database = getMemoryDatabase(databaseName)
    this.state = Object.freeze({
      engine: 'memory',
      persistent: false,
      fallbackReason,
    })
  }

  async get<Value>(key: string): Promise<Value | undefined> {
    this.#assertOpen()
    const value = this.#database.get(toInternalKey(this.#namespace, key))
    return value === undefined ? undefined : cloneStoredValue(value as Value)
  }

  async set<Value>(key: string, value: Value): Promise<void> {
    this.#assertOpen()
    const internalKey = toInternalKey(this.#namespace, key)
    this.#database.set(internalKey, cloneStoredValue(value))
  }

  async has(key: string): Promise<boolean> {
    this.#assertOpen()
    return this.#database.has(toInternalKey(this.#namespace, key))
  }

  async delete(key: string): Promise<void> {
    this.#assertOpen()
    this.#database.delete(toInternalKey(this.#namespace, key))
  }

  async keys(options: { prefix?: string } = {}): Promise<string[]> {
    this.#assertOpen()
    return this.#matchingInternalKeys(options.prefix).map((key) =>
      fromInternalKey(this.#namespace, key),
    )
  }

  async entries<Value>(
    options: { prefix?: string } = {},
  ): Promise<Array<readonly [string, Value]>> {
    this.#assertOpen()
    return this.#matchingInternalKeys(options.prefix).map((internalKey) => [
      fromInternalKey(this.#namespace, internalKey),
      cloneStoredValue(this.#database.get(internalKey) as Value),
    ])
  }

  async setMany(entries: ReadonlyArray<readonly [string, unknown]>): Promise<void> {
    this.#assertOpen()
    const normalizedEntries = entries.map(
      ([key, value]) => [toInternalKey(this.#namespace, key), cloneStoredValue(value)] as const,
    )
    if (normalizedEntries.length === 0) return

    const stagedDatabase = new Map(this.#database)
    for (const [key, value] of normalizedEntries) stagedDatabase.set(key, value)
    this.#replaceDatabaseContents(stagedDatabase)
  }

  async deleteMany(keys: readonly string[]): Promise<void> {
    this.#assertOpen()
    const internalKeys = keys.map((key) => toInternalKey(this.#namespace, key))
    if (internalKeys.length === 0) return

    const stagedDatabase = new Map(this.#database)
    for (const key of internalKeys) stagedDatabase.delete(key)
    this.#replaceDatabaseContents(stagedDatabase)
  }

  async clear(options: { prefix?: string } = {}): Promise<void> {
    this.#assertOpen()
    const internalKeys = this.#matchingInternalKeys(options.prefix)
    if (internalKeys.length === 0) return

    const stagedDatabase = new Map(this.#database)
    for (const key of internalKeys) stagedDatabase.delete(key)
    this.#replaceDatabaseContents(stagedDatabase)
  }

  close(): void {
    this.#closed = true
  }

  #matchingInternalKeys(callerPrefix?: string): string[] {
    const internalPrefix = toNamespacePrefix(this.#namespace, callerPrefix)
    return (
      [...this.#database.keys()]
        .filter((key) => key.startsWith(internalPrefix))
        // 使用稳定的字符串码元顺序，避免 localeCompare 因用户语言环境改变返回顺序。
        .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    )
  }

  /**
   * 先在副本完成全部可能失败的克隆和计算，再同步替换共享 Map 内容。
   * 同一 JavaScript 任务内没有 await，其他 Store 实例不会观察到中间状态。
   */
  #replaceDatabaseContents(nextDatabase: ReadonlyMap<string, unknown>): void {
    this.#database.clear()
    for (const [key, value] of nextDatabase) this.#database.set(key, value)
  }

  #assertOpen(): void {
    if (this.#closed) {
      throw new KeyValueStorageError('STORE_CLOSED', 'Key-Value Store 已关闭')
    }
  }
}

export function createMemoryKeyValueStore(
  options: MemoryStoreOptions,
  fallbackReason: StorageErrorCode,
): KeyValueStore {
  return new MemoryKeyValueStore(options, fallbackReason)
}
