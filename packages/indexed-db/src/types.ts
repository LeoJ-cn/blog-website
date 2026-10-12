/** 当前 Key-Value Store 实际使用的存储引擎。 */
export type StorageEngine =
  | 'indexed-db' // 使用浏览器 IndexedDB，数据可以跨页面刷新保留。
  | 'memory' // 使用页面内存，刷新、关闭或重新加载后数据丢失。

/**
 * 存储层稳定错误码。调用方应依据 code 决定提示或恢复策略，不解析错误消息文本。
 */
export type StorageErrorCode =
  | 'INDEXED_DB_UNSUPPORTED' // 当前运行环境没有可用的 IndexedDB API。
  | 'OPEN_BLOCKED' // 数据库打开或升级被其他未关闭连接阻塞。
  | 'CONNECTION_TERMINATED' // 浏览器异常终止了已建立的数据库连接。
  | 'QUOTA_EXCEEDED' // 浏览器存储配额不足；不会自动切换到空内存库。
  | 'TRANSACTION_ABORTED' // IndexedDB 事务在完成前被中止。
  | 'CONSTRAINT_VIOLATION' // add/put 违反了底层主键或唯一约束。
  | 'INVALID_KEY' // databaseName、namespace 或调用方 Key 不符合协议。
  | 'STORE_CLOSED' // Store 已显式关闭，禁止重新打开或继续操作。
  | 'CLONE_FAILED' // Value 不满足 structured clone 协议。
  | 'UNKNOWN' // 无法安全归类的底层错误。

export interface StorageRuntimeState {
  /** 当前实际使用的引擎；运行过程中可能从 indexed-db 变为 memory。 */
  engine: StorageEngine
  /** true 仅表示当前写入可以跨页面刷新保留，不表示已经同步到服务端。 */
  persistent: boolean
  /** 正常 IndexedDB 模式下为 null；内存降级时记录触发降级的原因。 */
  fallbackReason: StorageErrorCode | null
}

export interface CreateKeyValueStoreOptions {
  /** 浏览器 IndexedDB 数据库名称；不同 Feature Package 应使用不同名称。 */
  databaseName: string
  /** 同一数据库内的逻辑隔离名称；公共方法返回的 Key 不包含该前缀。 */
  namespace: string
  /** IndexedDB 不可用时进入当前页面生命周期内的内存模式。 */
  fallback: 'memory'
  /** 引擎状态变化通知；基础 Package 不负责渲染降级提示。 */
  onRuntimeStateChange?: (state: StorageRuntimeState) => void
}

export interface KeyValueStore {
  /** 当前运行状态快照；调用方不得改写其成员。 */
  readonly state: StorageRuntimeState

  /** Key 不存在或保存值为 undefined 时均返回 undefined；需要区分时使用 has。 */
  get<Value>(key: string): Promise<Value | undefined>
  set<Value>(key: string, value: Value): Promise<void>
  has(key: string): Promise<boolean>
  /** 删除不存在的 Key 也视为成功。 */
  delete(key: string): Promise<void>

  /** 按当前 namespace 内的调用方 Key 升序返回；prefix 为空时返回全部 Key。 */
  keys(options?: { prefix?: string }): Promise<string[]>
  /** 按当前 namespace 内的调用方 Key 升序返回 Key-Value；prefix 为空时返回全部。 */
  entries<Value>(options?: { prefix?: string }): Promise<Array<readonly [string, Value]>>

  /** 在单个原子批次中写入全部条目；任一条目失败时整批不得生效。 */
  setMany(entries: ReadonlyArray<readonly [string, unknown]>): Promise<void>
  /** 在单个原子批次中删除全部 Key；不存在的 Key 不导致失败。 */
  deleteMany(keys: readonly string[]): Promise<void>

  /** 无 prefix 时只清空当前 namespace，不影响同数据库的其他 namespace。 */
  clear(options?: { prefix?: string }): Promise<void>

  /** 幂等关闭当前句柄；关闭后所有异步数据方法必须返回 STORE_CLOSED。 */
  close(): void
}
