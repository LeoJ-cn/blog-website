# `@blog/indexed-db` Key-Value 存储设计

## 1. 背景与目标

当前项目运行在 GitHub Pages，没有服务端持久化能力。GIS 是第一个需要本地持久化的 Feature，但 IndexedDB 能力不能绑定 GIS 领域，后续低代码、标注等 Package 也需要以接近 `localStorage` 的方式复用。

本设计新增独立基础设施 Package：

- 目录：`packages/indexed-db`
- 包名：`@blog/indexed-db`
- 运行依赖：精确版本 `idb@7.1.1`

公共能力只表达异步 Key-Value 存储，不感知 Vue、Pinia、OpenLayers、GIS、HTTP 或任何 Feature 领域类型。

## 2. 设计目标

1. 提供接近 `localStorage` 的 `get`、`set`、`has`、`delete`、`keys`、`entries` 和 `clear`。
2. Value 使用浏览器 structured clone 语义，不要求调用方手工 `JSON.stringify`，并允许保存 `Blob`。
3. 支持批量原子写入和删除，满足一个业务操作同时更新多个 Key 的需求。
4. 通过 `databaseName` 隔离不同 Package，通过 `namespace` 隔离同一 Package 内的业务域。
5. IndexedDB 不可用或连接失败时自动降级到内存存储，并向调用方暴露非持久化状态。
6. IndexedDB 与 Memory Adapter 使用同一公共 API。
7. GIS 页面只调用 GIS 自己定义的异步模拟 API；模拟 API 内部使用 `@blog/indexed-db`，未来可以整体替换为真实 HTTP API。

## 3. 非目标

本 Package 不提供：

- ORM、领域 Repository 或实体关系映射；
- BBOX、空间索引、事件、轨迹或电子围栏协议；
- Vue composable、Pinia 插件或 UI 提示；
- HTTP、同步、冲突合并或跨设备数据共享；
- LocalStorage Adapter；
- 自动清理业务数据或业务级缓存淘汰；
- Service Worker 或伪造 HTTP 请求。

## 4. 依赖方向

```text
apps/web
    ↓
Feature Package（例如 @blog/openlayers-gis-demo）
    ↓
@blog/indexed-db
    ↓
idb@7.1.1
    ↓
浏览器 IndexedDB
```

Feature Package 负责 Key 规则和数据对象结构；`@blog/indexed-db` 只负责保存和读取 Key-Value。

## 5. 公共协议

### 5.1 创建参数

```ts
export interface CreateKeyValueStoreOptions {
  /** 浏览器 IndexedDB 数据库名称；不同 Package 应使用不同名称。 */
  databaseName: string
  /** 同一数据库内的逻辑隔离名称；对外返回的 Key 不包含该前缀。 */
  namespace: string
  /** IndexedDB 不可用时是否降级到当前页面生命周期内的内存存储。 */
  fallback: 'memory'
  /** 存储引擎状态发生变化时通知调用方；Package 本身不渲染 UI。 */
  onRuntimeStateChange?: (state: StorageRuntimeState) => void
}
```

`databaseName` 和 `namespace` 去除首尾空白后必须非空，否则创建失败。第一版不允许空命名空间，避免不同业务无意共享 Key。

### 5.2 运行状态

```ts
export type StorageEngine = 'indexed-db' | 'memory'

export interface StorageRuntimeState {
  engine: StorageEngine
  /** true 仅表示当前写入可跨页面刷新保留。 */
  persistent: boolean
  /** 正常 IndexedDB 模式下为 null；内存降级时记录触发原因。 */
  fallbackReason: StorageErrorCode | null
}
```

### 5.3 Key-Value API

```ts
export interface KeyValueStore {
  readonly state: StorageRuntimeState

  get<Value>(key: string): Promise<Value | undefined>
  set<Value>(key: string, value: Value): Promise<void>
  has(key: string): Promise<boolean>
  delete(key: string): Promise<void>

  keys(options?: { prefix?: string }): Promise<string[]>
  entries<Value>(options?: {
    prefix?: string
  }): Promise<Array<readonly [string, Value]>>

  /** 单个事务内完成全部写入；任一写入失败时整批回滚。 */
  setMany(entries: ReadonlyArray<readonly [string, unknown]>): Promise<void>
  /** 单个事务内完成全部删除；不存在的 Key 视为成功。 */
  deleteMany(keys: readonly string[]): Promise<void>

  /** 无 prefix 时只清空当前 namespace，不影响同数据库的其他 namespace。 */
  clear(options?: { prefix?: string }): Promise<void>

  /** 幂等关闭当前句柄；关闭后继续调用数据方法应返回明确错误。 */
  close(): void
}

export function createKeyValueStore(
  options: CreateKeyValueStoreOptions,
): Promise<KeyValueStore>
```

Key 去除首尾空白后必须非空。`keys` 和 `entries` 的 `prefix` 只匹配当前 namespace，返回 Key 时移除内部 namespace 前缀。

`get` 返回 `undefined` 无法区分“Key 不存在”和“已存储 undefined”；调用方需要区分时使用 `has`。第一版允许存储 structured clone 支持的值，不额外限制为 JSON。

## 6. IndexedDB Adapter

每个 `databaseName` 使用固定 Schema Version `1`，只创建一个 Object Store：

```text
Object Store: entries
Key: 完整内部字符串 Key
Value: 调用方传入的 structured-clone value
```

内部 Key 规则：

```text
${namespace}\u0000${callerKey}
```

使用不可见分隔符避免普通业务 Key 与 namespace 拼接产生歧义。调用方永远只看到自己的原始 Key。

前缀查询使用当前 namespace 的完整内部前缀构造 `IDBKeyRange`，通过游标读取，不扫描其他 namespace。批量操作使用一个 `readwrite` Transaction，并等待 `transaction.done` 后才报告成功。

连接采用惰性创建并在同一 Store 实例中复用。收到 `versionchange`/`blocking` 时关闭旧连接，避免阻塞未来升级。`close()` 后不自动重新打开，防止已经卸载的 Feature 意外持有资源。

事务范围内只执行 IndexedDB 请求，不等待网络、定时器或其他外部异步操作，避免事务因事件循环切换自动关闭。

## 7. Memory Adapter

出现以下情况时降级：

- 当前环境不存在 `indexedDB`；
- 数据库打开失败；
- 打开过程被阻塞且无法建立可用连接；
- 浏览器异常终止连接，后续无法恢复。

Memory Adapter 使用同一 `KeyValueStore` 协议：

- 数据仅存在当前页面生命周期；
- 页面刷新、关闭或重新加载后全部丢失；
- `state.engine` 为 `memory`，`persistent` 为 `false`；
- 首次降级及运行时降级都调用 `onRuntimeStateChange`；
- Feature 页面负责显示“当前为临时存储模式，刷新后数据将丢失”；
- Package 本身不依赖 UI，也不吞掉状态通知。

为了与 IndexedDB structured clone 边界一致，Memory Adapter 写入和读取时使用 `structuredClone`。调用方修改 `get` 返回对象不得直接污染存储中的值。

`setMany` 在临时副本上完成全部克隆与写入，成功后一次替换；任一步失败时保留原 Map。`deleteMany` 同样先在副本中操作再提交。

不同 Store 实例只要 `databaseName` 与 `namespace` 相同，就应在当前页面内看到同一份 Memory 数据；最后一个实例关闭时不主动清空，数据持续到页面生命周期结束。

## 8. 错误协议

```ts
export type StorageErrorCode =
  | 'INDEXED_DB_UNSUPPORTED'
  | 'OPEN_BLOCKED'
  | 'CONNECTION_TERMINATED'
  | 'QUOTA_EXCEEDED'
  | 'TRANSACTION_ABORTED'
  | 'CONSTRAINT_VIOLATION'
  | 'INVALID_KEY'
  | 'STORE_CLOSED'
  | 'CLONE_FAILED'
  | 'UNKNOWN'

export class KeyValueStorageError extends Error {
  readonly code: StorageErrorCode
  readonly cause?: unknown
}
```

IndexedDB 不支持、打开受阻、打开失败或连接异常终止可以触发 Memory 降级。无效 Key、structured clone 失败、约束冲突和调用已关闭 Store 属于调用错误，不触发降级。配额不足发生在已运行的持久化模式中时，不自动切换到空内存库，避免用户误以为数据已完整复制；调用方收到 `QUOTA_EXCEEDED` 后决定如何提示或清理数据。

错误消息不得包含被保存的 Value 内容，避免在日志中泄漏业务数据或附件。

## 9. GIS 调用边界

GIS 页面只依赖 `GisApi`：

```text
GisManagementDemo.vue
    ↓
GisApi
    ├── LocalGisApi（当前）
    │      ↓
    │  KeyValueStore
    │      ↓
    │  IndexedDB / Memory
    └── HttpGisApi（未来）
           ↓
        真实后端
```

`LocalGisApi` 定义自己的 Key：

```text
dataset:1k:metadata
dataset:1k:event:EVT-000001
dataset:1k:regions
dataset:1k:tracks
dataset:10k:metadata
dataset:10k:event:EVT-000001
```

四套数据源分别存储。新增、导入、编辑、删除、责任人、活动、附件、区域、轨迹和围栏告警只修改当前 `datasetId`，不影响其他数据源。数据源切换由 GIS API 负责整体重载和提示确认，不属于 `@blog/indexed-db` 的职责。

GIS 的 BBOX 固定网格、缓存和筛选继续留在 GIS Package。通用 KV Package 不实现空间索引。未来替换为 `HttpGisApi` 时，页面和 `GisApi` 请求/响应协议保持不变。

## 10. 其他 Package 调用示例

```ts
const storage = await createKeyValueStore({
  databaseName: 'blog-low-code',
  namespace: 'documents',
  fallback: 'memory',
})

await storage.set('document:demo-001', document)
const restored = await storage.get<LowCodeDocument>('document:demo-001')
```

不同 Package 默认使用独立 `databaseName`，避免数据库版本、清理和生命周期互相影响。

## 11. 生命周期与资源释放

- Feature 装配时创建 Store；业务组件通过上层 API 使用，不直接持有数据库连接。
- Feature 销毁时由装配层调用 `close()`。
- `close()` 后清理回调引用并关闭 IndexedDB 连接。
- Memory Adapter 不依赖计时器、DOM 或全局事件监听。
- 多实例连接共享只作为内部优化，不成为公共行为承诺。

## 12. 验证边界

本设计涉及新的基础设施代码。是否新增或修改测试代码必须在实施前单独询问，且只有用户准确回复 `允许添加测试代码` 后才可以触碰测试代码。

未获得测试代码授权时，实施不得使用 TDD，也不得生成测试文件；可以在另行获得非页面测试执行许可后运行仓库已有检查。页面和浏览器交互仍由用户手动验证。

