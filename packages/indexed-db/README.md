# `@blog/indexed-db`

通用的浏览器异步 Key-Value 存储 Package。它优先使用 IndexedDB；IndexedDB 不可用、打开失败、打开受阻或连接异常终止时，会切换到当前页面生命周期内共享的内存存储。

## 职责边界

本 Package 负责：

- 使用 `databaseName` 隔离不同 Feature Package；
- 使用 `namespace` 隔离同一数据库内的业务域；
- 提供单值、前缀枚举、批量原子写入/删除和局部清空；
- 保存浏览器 structured clone 支持的对象、`Blob`、`Map` 等值；
- 暴露真实运行引擎和降级原因，由上层决定如何提示用户。

本 Package 不负责业务实体、空间索引、Vue 状态、UI 提示、HTTP 请求、数据同步或冲突合并。GIS 等 Feature 应在自己的 API/Repository 层定义数据结构和 Key；未来切换后端接口也应发生在 Feature 层，而不是修改本 Package。

## 依赖关系

Package 内部固定使用精确版本 `idb@7.1.1`，调用方只从公共入口导入：

```ts
import { createKeyValueStore, KeyValueStorageError, type KeyValueStore } from '@blog/indexed-db'
```

不要依赖 `src/indexed-db`、`src/memory` 或其他内部文件。

## 创建与单值读写

```ts
const store = await createKeyValueStore({
  databaseName: 'blog-gis',
  namespace: 'dataset:1k',
  fallback: 'memory',
  onRuntimeStateChange(state) {
    if (!state.persistent) {
      // UI 提示应由 Feature 层实现：当前数据刷新后会丢失。
      console.warn('已进入临时存储模式', state.fallbackReason)
    }
  },
})

await store.set('metadata', { name: '1k 数据集', version: 1 })

const metadata = await store.get<{ name: string; version: number }>('metadata')
const exists = await store.has('metadata')

await store.delete('metadata')
```

`get()` 返回 `undefined` 时，可能是 Key 不存在，也可能是保存值本身为 `undefined`；需要区分时使用 `has()`。

## 对象与 Blob

调用方不需要手工 `JSON.stringify`。IndexedDB 使用浏览器原生 structured clone；Memory Adapter 在写入和读取时也会克隆，避免返回对象被修改后污染已保存数据。

```ts
await store.set('event:EVT-000001', {
  id: 'EVT-000001',
  coordinate: [116.397, 39.908], // [经度, 纬度]，单位为十进制度。
  tags: new Set(['warning']),
})

await store.set('attachment:ATT-001', new Blob(['demo'], { type: 'text/plain' }))
```

函数、DOM 节点等不支持 structured clone 的值会抛出 `CLONE_FAILED`，不会被静默转换。

## 前缀枚举与清空

```ts
const eventKeys = await store.keys({ prefix: 'event:' })
const events = await store.entries<GisEvent>({ prefix: 'event:' })

// 只删除当前 namespace 中 attachment: 开头的数据。
await store.clear({ prefix: 'attachment:' })

// 只清空当前 namespace，不影响相同数据库中的其他 namespace。
await store.clear()
```

返回结果按 Key 的字符串码元升序排列。公共 API 返回的 Key 不包含内部 namespace 前缀。

## 批量原子操作

```ts
await store.setMany([
  ['metadata', nextMetadata],
  ['event:EVT-000001', nextEvent],
])

await store.deleteMany(['event:EVT-000001', 'attachment:ATT-001'])
```

一次 `setMany()` 或 `deleteMany()` 要么全部生效，要么全部不生效。批量写入中任一 Value 无法克隆时，整批回滚。

## databaseName 与 namespace 隔离

```ts
const oneThousand = await createKeyValueStore({
  databaseName: 'blog-gis',
  namespace: 'dataset:1k',
  fallback: 'memory',
})

const tenThousand = await createKeyValueStore({
  databaseName: 'blog-gis',
  namespace: 'dataset:10k',
  fallback: 'memory',
})
```

两个 Store 可以使用相同业务 Key，但互相不可见。其他 Package 应使用独立数据库名，例如低代码 Package 可使用 `databaseName: 'blog-low-code'` 和 `namespace: 'documents'`。

## 降级状态

```ts
if (store.state.engine === 'memory') {
  showTemporaryStorageWarning('当前数据仅临时保存在内存中，刷新页面后会丢失。')
}
```

Memory 降级不会复制 IndexedDB 中的旧数据，也不会假装持久化成功。运行中连接终止时，后续请求进入共享内存存储；上层应依据 `onRuntimeStateChange` 重新加载当前业务数据并提示刷新丢失风险。

配额不足、无效 Key、Value 克隆失败和已关闭 Store 不会触发降级，它们会以 `KeyValueStorageError` 返回给调用方：

```ts
try {
  await store.set('event:EVT-000002', event)
} catch (error) {
  if (error instanceof KeyValueStorageError && error.code === 'QUOTA_EXCEEDED') {
    showStorageQuotaWarning()
  }
}
```

## 生命周期

Feature 装配时创建 Store，并通过自己的 API 层共享实例；Feature 卸载时关闭：

```ts
store.close()
```

`close()` 可重复调用。关闭后所有数据方法都会抛出 `STORE_CLOSED`；Memory 中同名数据库的数据不会因关闭单个实例而清空，但刷新或关闭页面后一定丢失。

## GIS 模拟 API 的推荐边界

GIS 页面不应直接调用 `KeyValueStore`，而应只依赖自己的接口：

```ts
export interface GisApi {
  getEvents(datasetId: string): Promise<GisEvent[]>
  saveEvent(datasetId: string, event: GisEvent): Promise<void>
}

export class LocalGisApi implements GisApi {
  constructor(private readonly store: KeyValueStore) {}

  async saveEvent(datasetId: string, event: GisEvent): Promise<void> {
    await this.store.set(`${datasetId}:event:${event.id}`, event)
  }
}
```

当前由 `LocalGisApi` 使用本 Package；未来实现 `HttpGisApi` 后替换 Feature 层依赖注入即可。真实后端接口、鉴权、重试和网络错误不属于 `@blog/indexed-db`。
