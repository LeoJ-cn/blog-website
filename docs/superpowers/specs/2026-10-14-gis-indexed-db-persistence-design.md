# GIS IndexedDB 数据量级持久化设计

## 1. 背景与目标

`@blog/openlayers-gis-demo` 当前通过确定性 Mock 生成器创建 1k、10k、50k 和 100k 事件数据，并由内存中的视口查询服务维护完整数据集、空间索引和 LRU 缓存。刷新页面后，用户新增、编辑、删除、导入、分派、处置、区域和附件数据均会丢失。

本设计将已经完成的 `@blog/indexed-db` 通用 Key-Value Package 接入 GIS Feature，使完整 Mock 数据和用户业务修改都保存在浏览器 IndexedDB 中，同时保留现有“完整数据集不进入 Pinia、地图只加载当前视口结果”的性能边界。

设计目标：

1. 将 `1k / 10k / 50k / 100k` 定义为稳定的数据量级，而不是任意数字输入。
2. 四个量级共享同一套固定事件序列，满足 `1k ⊂ 10k ⊂ 50k ⊂ 100k`。
3. 每个量级首次进入时生成完整 Mock 数据并写入 IndexedDB，后续刷新直接恢复。
4. 用户新增、编辑、删除、导入、处置、分派、区域和附件修改必须写入当前量级。
5. 页面只依赖 GIS 自己的异步 API，不直接依赖 IndexedDB Key 或底层 Adapter。
6. 保留最后选择的数据量级；切换量级的默认行为与刷新页面一致。
7. IndexedDB 不可用时沿用 `@blog/indexed-db` 的 Memory 降级，并明确提示刷新丢失风险。

## 2. 非目标

本阶段不实现：

- 服务端 API、跨设备同步、用户账号或冲突合并；
- 数据库导出、数据库管理页面或手工迁移工具；
- Web Worker、矢量瓦片、WebGL Layer 或新的 GIS 依赖；
- 将完整 100k 数据集放入 Pinia、Vue 深层响应式对象或 OpenLayers Source；
- LocalStorage Adapter；
- 页面自动化或浏览器代操作；页面验收由用户手动完成。

## 3. 数据量级协议

数据量级使用稳定联合类型，不在组件内散落数值判断：

```ts
export type GisDatasetScale = '1k' | '10k' | '50k' | '100k'

export const GIS_DATASET_SIZE_BY_SCALE: Readonly<Record<GisDatasetScale, number>> = {
  '1k': 1_000,
  '10k': 10_000,
  '50k': 50_000,
  '100k': 100_000,
}
```

`datasetScale` 表示用户选择的稳定基准档位。`datasetSize` 表示当前真实事件数量；导入、新增或删除后，`datasetSize` 可以偏离档位基准值，但 `datasetScale` 不变。

Mock 生成器使用与数量无关的固定种子。相同索引的事件在全部量级中保持相同 ID、坐标、类型、状态、等级、地址和创建时间，因此较小量级始终是较大量级的前缀子集。

## 4. 页面位置与交互

“数据量级”使用下拉框，放在标题“城市巡检运营工作台”右侧，并位于主导航之前。标题区域使用 Flexbox 排列，不使用 CSS Grid。

```text
城市巡检运营工作台  数据量级 [10k ▾]  实时态势 / 任务调度 / 巡检复盘
```

下拉项固定为 1k、10k、50k 和 100k。初始化或切换期间下拉框禁用并显示加载语义，避免连续操作形成竞态。当前存储降级为 Memory 时，标题区域显示“临时存储，刷新后丢失”。

原底部“性能测试”工具条不再展示数据量按钮，只保留空间交互和渲染模式。性能指标继续展示当前真实完整数据量、生成耗时、索引构建耗时和视口查询指标。

## 5. 架构与依赖方向

```text
GisManagementDemo.vue
        ↓
GisApi
        ↓
LocalGisApi
├── GisDatasetRepository
│   └── @blog/indexed-db
└── ViewportEventService
    ├── 完整事件内存快照
    ├── SpatialGridIndex
    └── LRU 查询缓存
```

### 5.1 `GisManagementDemo.vue`

- 展示数据量级、加载状态、持久化状态和业务错误。
- 调用 `GisApi` 初始化、查询和执行用户操作。
- 不创建 IndexedDB Key，不依赖 Repository 内部类型。
- 仍负责 MapManager、Blob URL 和页面会话状态的生命周期。

### 5.2 `GisApi`

`GisApi` 是 Feature 内稳定的异步数据访问协议。它负责：

- 初始化最后选择的数据量级；
- 返回当前量级、真实数量和存储状态；
- 提供视口查询；
- 提供事件新增、编辑、删除、导入覆盖、状态推进和责任人操作；
- 提供区域和附件操作；
- 关闭资源。

未来 `HttpGisApi` 可以实现同一业务协议。页面、Pinia 和 MapManager 不依赖 `LocalGisApi` 的持久化细节。

### 5.3 `LocalGisApi`

- 编排 Repository 与视口查询服务。
- 初始化时恢复完整事件集合，再构建空间索引。
- 采用写穿语义：持久化成功后才更新内存数据集、索引、缓存和页面状态。
- 修改完整数据集后使旧查询缓存失效，并让页面重新查询当前视口。
- 关闭后拒绝继续写入，防止旧量级实例污染新量级。

### 5.4 `GisDatasetRepository`

- 只负责 GIS 数据的 Key 规则、分片、恢复、初始化和原子写入。
- 依赖 `@blog/indexed-db` 公共 API，不导入 Adapter、Schema 或内部 Key 工具。
- 不依赖 Vue、Pinia、OpenLayers、DOM 或页面组件。

### 5.5 Pinia 与 OpenLayers

Pinia 继续只保存当前视口事件、筛选、选择、区域结果和页面会话状态。完整 1k～100k 数据只存在于 Local API 的普通内存集合、空间索引及 IndexedDB 中。OpenLayers Source 继续只持有当前视口 Feature。

## 6. IndexedDB 结构

物理结构固定为：

```text
databaseName: blog-gis
schema version: 1
object store: entries
```

逻辑 namespace：

```text
settings
dataset:1k
dataset:10k
dataset:50k
dataset:100k
```

这些 namespace 不是文件目录。它们通过 `@blog/indexed-db` 的内部 Key 前缀共享同一个 `blog-gis` 数据库和 `entries` Object Store。

### 6.1 Settings

`settings` namespace 保存：

```ts
interface GisSettings {
  /** 用户最后选择的数据量级；页面刷新后据此恢复。 */
  activeDatasetScale: GisDatasetScale
}
```

首次访问且没有设置时使用 `10k`。

### 6.2 Dataset metadata

每个 `dataset:*` namespace 使用 `metadata` Key：

```ts
interface GisDatasetMetadata {
  scale: GisDatasetScale
  /** 当前真实事件数量，允许因用户修改偏离量级基准值。 */
  currentEventCount: number
  /** 固定 Mock 生成规则版本；不一致时重建当前量级。 */
  fixtureVersion: number
  /** 事件固定分片数量；第一版固定为 128。 */
  shardCount: 128
  /** ISO 8601 格式的首次初始化时间。 */
  initializedAt: string
  /** ISO 8601 格式的最近持久化修改时间。 */
  updatedAt: string
}
```

### 6.3 事件分片

事件完整存储在 `events:shard:000`～`events:shard:127`。事件 ID 通过稳定、与运行环境无关的字符串哈希映射到 128 个分片。

固定分片而非数组位置切块的原因：

- 新增、编辑和删除只重写一个分片；
- 删除不会让后续大量事件跨块移动；
- 任意导入 ID 都可以直接定位；
- 100k 档位每个分片平均约 781 条事件，避免单值过大。

读取完整数据集时按分片编号升序加载，再按事件 ID 建立内存 Map 和空间索引。业务不依赖分片内数组顺序。

### 6.4 其他业务数据

每个数据量级独立保存：

```text
regions
assignee:<eventId>
activities:<eventId>
attachment-meta:<eventId>
attachment-blob:<attachmentId>
```

预设区域与用户区域共同保存在 `regions`。责任人与活动仅为发生过用户操作的事件创建 Key，避免为十万条基础事件预建空数据。附件元数据与 Blob 分离，避免修改普通事件字段时重写图片内容。

需要与事件分片在同一业务事务内删除的辅助值使用显式 `null` 墓碑。读取层把墓碑解释为不存在；不能使用 `undefined`，因为公共 `get()` 无法区分“不存在”和“保存值为 undefined”。墓碑允许 Repository 通过一个 `setMany` 同时提交分片更新、metadata 更新和逻辑删除，而无需扩展 `@blog/indexed-db` 的公共 API。

## 7. 首次初始化与恢复

首次进入某个量级：

1. 打开该量级的 KeyValueStore。
2. 读取 `metadata`。
3. metadata 不存在时生成完整固定 Mock 数据。
4. 将事件分配到 128 个分片。
5. 通过一个原子批量写入保存 metadata、全部事件分片和预设区域。
6. 从已持久化结果建立内存事件 Map、空间索引和查询缓存。

再次进入：

1. metadata 的 `fixtureVersion` 与当前代码一致时读取已有分片。
2. 不重新生成，也不覆盖用户修改。
3. 恢复区域、责任人、活动和附件元数据。
4. 建立空间索引后才允许视口查询和业务修改。

`fixtureVersion` 不一致时重建当前量级的固定数据。第一版不迁移旧 Mock 修改；页面应明确提示该量级的演示数据已按新版本重置。其他量级不受影响。

## 8. 用户操作与持久化一致性

所有修改使用写穿策略：先成功提交 Repository，再修改 Local API 内存数据、空间索引、缓存、Pinia 和地图。持久化失败时 UI 不得假装成功。

### 8.1 新增和编辑

- 新增事件写入其哈希目标分片，并更新 metadata 数量与时间。
- 编辑和状态推进替换目标分片中的完整事件对象。
- 保存成功后更新空间索引并清除旧查询缓存。

### 8.2 删除

删除事件使用同一原子批次：

- 从事件分片移除事件；
- 更新 metadata；
- 将责任人、活动、附件元数据和附件 Blob 写为 `null` 墓碑；
- 从区域已计算 eventIds 中清理该 ID。

任一步失败时整批不生效。

### 8.3 分派、活动和区域

- 分派和状态操作同步写入事件、责任人和活动记录。
- 自定义区域保存、修改和删除都更新当前量级的 `regions`。
- 批量状态推进按受影响分片分组，并与对应活动记录通过一个原子批次提交。

### 8.4 附件

- 附件 Blob 与元数据在同一原子批次写入。
- IndexedDB 写入成功后才创建页面 Blob URL。
- 删除附件时在同一原子批次更新附件元数据列表，并将目标 Blob 写为 `null` 墓碑。
- 页面卸载时只撤销 Blob URL，不删除 IndexedDB 数据。

墓碑的物理清理不属于用户操作的成功条件。未来可以在初始化后的空闲阶段使用 `deleteMany` 清理已经没有业务引用的墓碑；第一版不增加后台清理任务。

## 9. GeoJSON 导入覆盖

导入采用 upsert 语义：

- 已存在的事件 ID 使用导入数据覆盖事件基础字段；
- 不存在的事件 ID 新增；
- 未出现在导入文件中的原有事件保持不变；
- 覆盖事件时保留既有责任人、活动和附件；
- 文件内重复 ID 不参与覆盖，后出现的重复项计入拒绝数量；
- 非法 Feature 继续计入非法数量。

导入结果返回：

```ts
interface GisEventImportResult {
  addedCount: number
  overwrittenCount: number
  invalidCount: number
  duplicateInFileCount: number
}
```

所有新增和覆盖按目标分片聚合，通过一次 `setMany` 原子提交。任一分片失败时整批导入不生效，内存数据、索引、缓存、Pinia 和地图保持原状态。

## 10. 数据量级切换

切换量级采用真实页面刷新，以确保行为与用户主动刷新完全一致：

1. 用户在标题右侧下拉框选择目标量级。
2. 页面将目标量级写入 `settings/active-scale`。
3. 保存成功后调用 `window.location.reload()`。
4. 页面重新挂载时先读取 active scale。
5. 打开对应 `dataset:*` namespace，恢复或首次生成数据。
6. 完成空间索引后初始化地图查询。

保存 active scale 失败时不刷新，保留当前量级并提示错误。下拉框在保存和初始化期间禁用。

真实刷新会自然清除筛选、选择、分页、绘制、请求、地图对象和轨迹播放进度。各量级的数据、区域、责任人、活动和附件互相隔离。

## 11. 错误与降级

- IndexedDB 不可用、打开失败、blocked 或 terminated 时由 `@blog/indexed-db` 切换到共享 Memory。
- 页面可以继续操作，但必须显示“临时存储，刷新后丢失”。
- 配额不足不切换到空 Memory，调用方收到 `QUOTA_EXCEEDED` 并提示清理空间。
- 初始化失败时不创建半成品空间索引，页面进入可重试错误状态。
- 新增、编辑、删除、导入和附件失败时不更新 UI 成功状态。
- 状态回调错误不得破坏已经完成的引擎切换。
- 错误消息不得包含附件 Blob 或完整事件内容。

## 12. 生命周期

页面挂载时：

1. 创建 LocalGisApi；
2. 读取最后选择的数据量级；
3. 初始化 Repository 和完整事件数据；
4. 构建空间索引；
5. 创建 ViewportQueryController 与 MapManager；
6. 查询首个有效视口。

页面卸载时依次：

- 取消动画帧；
- 撤销页面 Blob URL；
- 销毁查询控制器；
- 销毁 LocalGisApi 的索引和缓存；
- 关闭 settings 与 dataset KeyValueStore；
- 销毁 MapManager。

关闭后的 LocalGisApi 和 Repository 禁止继续读写。

## 13. 测试策略

用户已在当前任务中准确回复 `允许添加测试代码`，允许为本次 GIS IndexedDB 接入新增和修改测试代码。测试执行仍需单独确认；页面操作始终由用户手动完成。

非页面测试使用真实 Repository 和 `@blog/indexed-db` 的 Memory 降级实现，不新增模拟 IndexedDB 第三方依赖。

TDD 覆盖：

1. 数据量级映射与固定数据包含关系；
2. 首次初始化、跨实例恢复、fixture 版本重建和 namespace 隔离；
3. 新增、编辑、删除、状态推进、分派、区域和附件持久化；
4. 导入新增与覆盖、文件内重复、非法数据及整批回滚；
5. 持久化失败时内存数据不提前改变；
6. 恢复数据后建立空间索引，修改后缓存失效；
7. Memory 降级状态向页面层传递；
8. 关闭旧实例后拒绝继续写入。

页面手动验收：

- 下拉框位于标题右侧；
- 切换后刷新并进入目标量级；
- 再次刷新仍保留最后选择；
- 新增、编辑、删除、导入覆盖、区域和附件刷新后仍存在；
- 不同量级数据互相隔离；
- 降级和保存失败提示准确；
- 所有新增布局只使用 Flexbox。

## 14. 依赖与文件边界

`@blog/openlayers-gis-demo` 增加对 `@blog/indexed-db` 的精确 Workspace 依赖，不增加第三方运行依赖。任何依赖安装或锁文件更新必须先取得用户确认。

预计新增：

```text
packages/openlayers-gis-demo/src/
├── api/
│   ├── types.ts
│   └── local-gis-api.ts
├── persistence/
│   ├── dataset-scale.ts
│   ├── gis-dataset-repository.ts
│   ├── gis-settings-repository.ts
│   └── types.ts
```

预计修改：

- `mock/generate-events.ts`：固定种子与量级包含关系；
- `viewport/mock-viewport-event-service.ts`：接收恢复后的完整事件快照并支持修改后重建；
- `components/GisManagementDemo.vue`：异步初始化、下拉框、状态提示和 API 调用；
- `services/export-events.ts`：导入结果扩展为新增与覆盖统计；
- `stores/gis.ts`：只保留视口与会话状态，不加入持久化职责；
- `src/index.ts`：只导出需要给应用或未来消费者使用的公共协议；
- `package.json`、`pnpm-lock.yaml`：增加精确 Workspace 依赖；
- `README.md`：更新数据量级、持久化、降级和手动验收说明。

`apps/web` 预计不修改。若实施中发现必须增加应用级服务装配，需先补充设计并重新确认工作区域规则。
