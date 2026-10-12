import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { KeyValueStorageError, toKeyValueStorageError } from '../errors'
import {
  fromInternalKey,
  normalizeDatabaseName,
  normalizeNamespace,
  toInternalKey,
  toNamespacePrefix,
} from '../internal/key'
import type { KeyValueStore, StorageRuntimeState } from '../types'

const DATABASE_VERSION = 1
const STORE_NAME = 'entries'

interface KeyValueDatabaseSchema extends DBSchema {
  entries: {
    key: string
    value: unknown
  }
}

export interface NormalizedCreateKeyValueStoreOptions {
  databaseName: string
  namespace: string
}

export interface IndexedDbStoreCallbacks {
  onBlocked(): void
  onTerminated(): void
}

class IndexedDbKeyValueStore implements KeyValueStore {
  readonly state: StorageRuntimeState = Object.freeze({
    engine: 'indexed-db',
    persistent: true,
    fallbackReason: null,
  })

  readonly #database: IDBPDatabase<KeyValueDatabaseSchema>
  readonly #namespace: string
  #closed = false

  constructor(database: IDBPDatabase<KeyValueDatabaseSchema>, namespace: string) {
    this.#database = database
    this.#namespace = normalizeNamespace(namespace)
  }

  async get<Value>(key: string): Promise<Value | undefined> {
    this.#assertOpen()
    try {
      return (await this.#database.get(STORE_NAME, toInternalKey(this.#namespace, key))) as
        | Value
        | undefined
    } catch (error) {
      throw toKeyValueStorageError(error)
    }
  }

  async set<Value>(key: string, value: Value): Promise<void> {
    this.#assertOpen()
    try {
      await this.#database.put(STORE_NAME, value, toInternalKey(this.#namespace, key))
    } catch (error) {
      throw toKeyValueStorageError(error)
    }
  }

  async has(key: string): Promise<boolean> {
    this.#assertOpen()
    try {
      return (
        (await this.#database.getKey(STORE_NAME, toInternalKey(this.#namespace, key))) !== undefined
      )
    } catch (error) {
      throw toKeyValueStorageError(error)
    }
  }

  async delete(key: string): Promise<void> {
    this.#assertOpen()
    try {
      await this.#database.delete(STORE_NAME, toInternalKey(this.#namespace, key))
    } catch (error) {
      throw toKeyValueStorageError(error)
    }
  }

  async keys(options: { prefix?: string } = {}): Promise<string[]> {
    this.#assertOpen()
    return this.#readByPrefix<string>(options.prefix, (key) =>
      fromInternalKey(this.#namespace, key),
    )
  }

  async entries<Value>(
    options: { prefix?: string } = {},
  ): Promise<Array<readonly [string, Value]>> {
    this.#assertOpen()
    return this.#readByPrefix<readonly [string, Value]>(options.prefix, (key, value) => [
      fromInternalKey(this.#namespace, key),
      value as Value,
    ])
  }

  async setMany(entries: ReadonlyArray<readonly [string, unknown]>): Promise<void> {
    this.#assertOpen()
    const normalizedEntries = entries.map(
      ([key, value]) => [toInternalKey(this.#namespace, key), value] as const,
    )
    if (normalizedEntries.length === 0) return

    const transaction = this.#database.transaction(STORE_NAME, 'readwrite')
    try {
      const requests = normalizedEntries.map(([key, value]) => transaction.store.put(value, key))
      await Promise.all([...requests, transaction.done])
    } catch (error) {
      // 某个 put 在创建请求时同步失败（例如 Value 无法克隆）不会保证事务自动回滚，
      // 因此主动 abort，避免同一批次中更早发出的写入意外提交。
      try {
        transaction.abort()
      } catch {
        // 事务已经结束或已经中止时无需覆盖原始错误。
      }
      throw toKeyValueStorageError(error)
    }
  }

  async deleteMany(keys: readonly string[]): Promise<void> {
    this.#assertOpen()
    const internalKeys = keys.map((key) => toInternalKey(this.#namespace, key))
    if (internalKeys.length === 0) return

    const transaction = this.#database.transaction(STORE_NAME, 'readwrite')
    try {
      const requests = internalKeys.map((key) => transaction.store.delete(key))
      await Promise.all([...requests, transaction.done])
    } catch (error) {
      throw toKeyValueStorageError(error)
    }
  }

  async clear(options: { prefix?: string } = {}): Promise<void> {
    this.#assertOpen()
    const internalPrefix = toNamespacePrefix(this.#namespace, options.prefix)
    const transaction = this.#database.transaction(STORE_NAME, 'readwrite')

    try {
      let cursor = await transaction.store.openCursor(IDBKeyRange.lowerBound(internalPrefix))
      while (cursor && String(cursor.key).startsWith(internalPrefix)) {
        await cursor.delete()
        cursor = await cursor.continue()
      }
      await transaction.done
    } catch (error) {
      throw toKeyValueStorageError(error)
    }
  }

  close(): void {
    if (this.#closed) return
    this.#closed = true
    this.#database.close()
  }

  async #readByPrefix<Result>(
    callerPrefix: string | undefined,
    select: (key: string, value: unknown) => Result,
  ): Promise<Result[]> {
    const internalPrefix = toNamespacePrefix(this.#namespace, callerPrefix)
    const results: Result[] = []

    try {
      let cursor = await this.#openReadonlyCursor(internalPrefix)
      while (cursor && String(cursor.key).startsWith(internalPrefix)) {
        results.push(select(String(cursor.key), cursor.value))
        cursor = await cursor.continue()
      }
      return results
    } catch (error) {
      throw toKeyValueStorageError(error)
    }
  }

  #openReadonlyCursor(internalPrefix: string) {
    return this.#database
      .transaction(STORE_NAME, 'readonly')
      .store.openCursor(IDBKeyRange.lowerBound(internalPrefix))
  }

  #assertOpen(): void {
    if (this.#closed) {
      throw new KeyValueStorageError('STORE_CLOSED', 'Key-Value Store 已关闭')
    }
  }
}

export async function openIndexedDbKeyValueStore(
  options: NormalizedCreateKeyValueStoreOptions,
  callbacks: IndexedDbStoreCallbacks,
): Promise<KeyValueStore> {
  const databaseName = normalizeDatabaseName(options.databaseName)
  const namespace = normalizeNamespace(options.namespace)
  let invalidatedWhileOpening = false
  let openedDatabase: IDBPDatabase<KeyValueDatabaseSchema> | null = null
  let rejectBlocked: ((error: KeyValueStorageError) => void) | null = null

  const blockedPromise = new Promise<never>((_resolve, reject) => {
    rejectBlocked = reject
  })
  const openingPromise = openDB<KeyValueDatabaseSchema>(databaseName, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    },
    blocked() {
      invalidatedWhileOpening = true
      callbacks.onBlocked()
      rejectBlocked?.(new KeyValueStorageError('OPEN_BLOCKED', 'IndexedDB 打开被其他连接阻塞'))
    },
    blocking() {
      openedDatabase?.close()
      callbacks.onTerminated()
    },
    terminated() {
      callbacks.onTerminated()
    },
  })

  // blocked 后 openDB 仍可能在旧连接关闭时成功；迟到连接必须主动关闭。
  void openingPromise
    .then((database) => {
      if (invalidatedWhileOpening) database.close()
    })
    .catch(() => undefined)

  openedDatabase = await Promise.race([openingPromise, blockedPromise])
  if (invalidatedWhileOpening) {
    openedDatabase.close()
    throw new KeyValueStorageError('OPEN_BLOCKED', 'IndexedDB 打开被其他连接阻塞')
  }
  return new IndexedDbKeyValueStore(openedDatabase, namespace)
}
