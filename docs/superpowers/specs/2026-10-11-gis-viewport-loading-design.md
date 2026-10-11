# GIS 视口加载与请求治理设计

## 1. 状态

**状态：** 已确认设计，等待实施计划。

## 2. 背景

当前 `@blog/openlayers-gis-demo` 可以生成 1k、10k、50k、100k 固定种子事件，但完整筛选结果会一次性进入 Pinia 和 OpenLayers `VectorSource`。地图移动只更新统计，不会按视口请求或卸载数据。

当前已经具备：

- Vue 3、Pinia 与 OpenLayers 的管理器边界；
- Point、Cluster、Heatmap、Region、Track 等独立图层；
- 单事件 Feature 增量增加、更新和删除；
- 批量 `clear + addFeatures`；
- Polygon/Circle 空间查询；
- 数据生成、Feature 转换、Source 更新和 `rendercomplete` 计时。

本阶段在不引入后端、Web Worker、矢量瓦片或 WebGL 的前提下，建立可运行、可测试、未来可替换为 HTTP BBOX API 的视口数据加载边界。

## 3. 目标

1. 地图只加载当前 WGS84 视口范围内的事件，而不是把完整 Mock 数据集全部写入地图和 Pinia。
2. 使用前端 Mock BBOX 服务模拟真实后端查询协议。
3. 使用固定经纬度分桶索引缩小 BBOX 查询候选集。
4. 实现取消、竞态保护、缓存、错误状态和重试。
5. 使用事件 ID Diff 增量同步 OpenLayers Event Source。
6. 保持 Event、Cluster 和 Heatmap 共享同一个 Event Source。
7. 提供可核查的索引、查询、缓存和 Feature Diff 指标，但不预设性能提升结论。

## 4. 非目标

本阶段不实现：

- 真实 HTTP 后端或数据库；
- PostGIS、服务端 R-tree 或服务端 Cluster；
- Vector Tile/MVT；
- WebGL Layer；
- Web Worker；
- WebSocket 实时数据；
- 完整电子围栏进出告警；
- 跨会话持久化；
- 自动页面操作或浏览器性能测试。

## 5. 核心语义

### 5.1 完整数据集

完整数据集只存在于 Mock 服务内部。数据量控制的 1k、10k、50k、100k 表示服务端模拟数据集规模，不再表示地图一次加载的 Feature 数量。

### 5.2 当前视口事件

Pinia 和 OpenLayers 只保存当前查询成功返回的事件。列表、统计、事件详情和地图图层默认解释为当前视口结果。

### 5.3 BBOX

```ts
/** WGS84 BBOX，依次为最小经度、最小纬度、最大经度、最大纬度；边界包含。 */
export type Wgs84Bbox = readonly [number, number, number, number]
```

BBOX 查询使用闭区间语义：位于边界上的事件应被包含。跨日期变更线不是当前上海演示数据的目标范围；若输入出现 `minLng > maxLng`，服务应返回明确协议错误，而不是静默拆分查询。

## 6. 模块设计

### 6.1 Viewport Event Service 协议

新增框架无关接口：

```ts
export interface ViewportEventQuery {
  bbox: Wgs84Bbox
  filter: InspectionEventFilter
  signal?: AbortSignal
}

export interface ViewportEventQueryResult {
  events: InspectionEvent[]
  datasetSize: number
  candidateCount: number
  matchedCount: number
  queryDurationMs: number
  cacheHit: boolean
}

export interface ViewportEventService {
  setDatasetSize(count: number): ViewportDatasetBuildStats
  query(query: ViewportEventQuery): Promise<ViewportEventQueryResult>
  clearCache(): void
  destroy(): void
}
```

接口不导入 Vue 或 OpenLayers 类型。未来 HTTP Adapter 可以实现相同 `query` 语义。

### 6.2 Mock 数据集

Mock Service 使用现有 `generateInspectionEvents(count)` 生成完整确定性数据集。`setDatasetSize`：

1. 规范化并生成完整数据；
2. 建立空间分桶索引；
3. 清空查询缓存；
4. 返回数据生成与索引构建耗时；
5. 更新数据集版本，防止旧查询结果复用。

数据集切换允许整体重建，因为完整数据身份已经变化。

### 6.3 经纬度分桶索引

使用固定角度网格，不依赖 OpenLayers：

```text
gridX = floor(lng / cellSizeDegrees)
gridY = floor(lat / cellSizeDegrees)
gridKey = `${gridX}:${gridY}`
```

每个桶保存事件引用或事件 ID。查询时：

1. 计算 BBOX 覆盖的最小/最大网格坐标；
2. 遍历相交网格；
3. 合并候选事件；
4. 对候选事件做精确闭区间 BBOX 判断；
5. 应用 keyword/type/status/level 业务筛选。

固定网格不是通用 GIS 索引，也不应描述为自研 R-tree。它是当前前端 Mock 服务对服务端空间查询的可运行模拟。

`cellSizeDegrees` 作为服务内部明确常量。选值应覆盖当前城市尺度，并通过候选数和命中数观察效果；本设计不预设最优值或性能倍数。

### 6.4 异步和取消

Mock 查询必须异步完成并支持 `AbortSignal`：

- 查询开始和模拟延迟期间检查 `signal.aborted`；
- 取消时抛出标准 `AbortError`；
- Abort 不进入用户可见错误状态；
- `destroy` 之后拒绝新查询。

模拟延迟用于验证请求治理，不用于伪造网络性能。

### 6.5 查询缓存

缓存 Key 至少包含：

- 数据集版本；
- 量化后的 WGS84 BBOX；
- keyword/type/status/level。

BBOX 量化用于减少极小视图浮点差异导致的重复查询。量化不能让缓存结果小于真实视口，因此缓存 BBOX 应向外扩张或查询返回后再次按真实 BBOX过滤。

缓存使用有界 LRU 或等价的有界淘汰策略。缓存命中仍需尊重 AbortSignal，返回事件数组副本或只读结果，防止调用方修改缓存内容。

### 6.6 Viewport Query Controller

新增与 Vue 生命周期配合的请求控制器或 composable，职责包括：

- 保存当前 `AbortController`；
- 维护递增 request ID；
- 新查询开始前取消旧请求；
- 只有最后一次有效请求可以提交结果；
- 暴露 `idle/loading/success/empty/error`；
- Abort 不覆盖现有成功数据，也不显示错误；
- 普通错误保留现有地图结果并允许重试；
- 卸载时取消请求并销毁服务。

请求 ID 是 AbortController 之外的第二层保护，因为某些异步步骤可能在取消信号传播前已经完成。

## 7. MapManager 扩展

### 7.1 获取当前视口

新增只返回业务协议的方法：

```ts
getViewportBbox(): Wgs84Bbox | null
```

实现流程：

1. 读取 Map Size；
2. 通过 View 计算当前投影 extent；
3. 使用 `transformExtent` 转换到 EPSG:4326；
4. 规范化并限制经纬度范围；
5. Map 尚未挂载或 Size 无效时返回 `null`。

### 7.2 视口变化通知

`MapManagerOptions` 增加 `onViewportChange?: (bbox: Wgs84Bbox) => void`。

触发时机：

- `mount` 后首次获取有效 BBOX；
- `moveend` 后 BBOX 发生变化。

不在 `pointermove`、动画每帧或缩放进行中查询。首次查询需要在 Map 已绑定 DOM 并完成 Size 更新后触发。

### 7.3 Feature Diff

新增：

```ts
syncEvents(events: readonly InspectionEvent[]): EventSourceDiffStats
```

算法：

1. 建立新结果 `eventId → event` Map；
2. 遍历当前 Source Feature：
   - 新结果不存在 → 删除；
   - 仍存在 → 比较地图相关字段并按需更新；
3. 遍历剩余新结果 → 创建并新增 Feature；
4. 返回 added/updated/removed/unchanged 和耗时。

地图相关字段包括 ID、坐标、type、status、level。address/createdAt 不写入 Feature，但 Vue 业务对象变化仍由查询结果更新。

如果被删除 Feature 当前处于 Selection 或 Popup：

- 清除 Selection Geometry；
- 清除 Popup；
- 通过回调通知 Vue 清理失效选择。

普通点、Cluster 和 Heatmap 继续共享 Source，不分别执行 Diff。

### 7.4 保留批量替换

现有 `setEvents` 不删除，用于：

- 数据集版本完全切换；
- 管理器初始化；
- 明确需要重置所有 Feature 身份的场景。

正常视口查询结果使用 `syncEvents`。

## 8. Vue 和 Pinia 数据流

### 8.1 初始化

```text
页面 onMounted
→ 创建 MockViewportEventService(datasetSize)
→ 创建 MapManager（初始 events 为空）
→ mount
→ onViewportChange(initialBbox)
→ Query Controller.query
→ Mock Service 网格候选 + 精确过滤
→ Pinia.replaceViewportEvents
→ MapManager.syncEvents
→ 列表/统计/地图更新
```

### 8.2 地图移动

```text
OpenLayers moveend
→ WGS84 BBOX
→ 取消上一请求
→ 新 request ID
→ cache/query
→ 仅最后有效响应提交
→ Store 当前视口事件替换
→ Event Source ID Diff
```

### 8.3 数据量切换

```text
用户选择 100k
→ Service.setDatasetSize(100000)
→ 重建索引 + 清空缓存 + 新 datasetVersion
→ MapManager.setEvents([])
→ 清理当前选择和区域查询结果
→ 重新查询当前 BBOX
```

### 8.4 筛选

筛选条件进入 BBOX 查询，而不是先把完整数据交给 Pinia 再过滤。筛选变化：

- 取消旧请求；
- 使用相同当前 BBOX 发起新查询；
- 成功后替换当前视口业务事件并 Diff Feature；
- 清理不再存在的选中项；
- 页码回到 1。

### 8.5 区域筛选

Polygon/Circle 查询只能作用于当前已加载视口事件。UI 和文档必须明确这一范围，避免误解为对完整 100k 数据集执行全局空间查询。

如果未来需要全局围栏查询，应把 RegionGeometry 发送到服务端，由服务端空间查询返回结果。

## 9. UI 状态

页面增加或调整以下信息：

- 完整 Mock 数据集规模；
- 当前视口命中数量；
- 候选点数量；
- 查询状态；
- 缓存命中；
- 索引构建耗时；
- BBOX 查询耗时；
- Feature added/updated/removed；
- Diff 耗时；
- rendercomplete 延迟；
- 错误信息和重试入口。

加载时保留已有地图结果，避免地图闪空。首次查询尚无结果时展示明确 Loading。空结果与请求失败必须区分。

导出按钮文案改为“导出当前视口结果”。统计、分页和列表均明确属于当前视口。

## 10. 错误和边界处理

- Map 未挂载或 Size 无效：不查询，等待下一次有效视口通知；
- 非法 BBOX：服务返回协议错误；
- Abort：静默结束，不改变 error；
- 普通错误：保留旧结果，展示错误与重试；
- 新响应早于旧响应：request ID 只允许最新响应提交；
- 相同 ID 数据重复：数据集构建时拒绝或记录明确错误；
- 缓存命中后被调用方修改：通过副本或只读协议隔离；
- 数据集切换期间旧响应到达：datasetVersion 和 request ID 共同阻止提交；
- 当前选择离开视口：清除详情、Selection 与 Popup；
- 区域仍存在但视口事件变化：重新计算当前已加载事件的区域命中。

## 11. 测试设计

用户已允许本阶段新增或修改非页面测试代码。页面操作仍由用户手动完成。

### 11.1 空间分桶

- 点落入正确网格；
- 负坐标网格计算；
- BBOX 跨多个网格；
- BBOX 边界点包含；
- 分桶查询结果与线性扫描基准一致；
- 业务筛选组合一致。

### 11.2 请求治理

- 新请求取消旧请求；
- Abort 不进入 error；
- 旧请求后返回不能覆盖新请求；
- 数据集切换使旧响应失效；
- 普通错误保留现有结果；
- 重试复用最新参数。

### 11.3 缓存

- 相同数据集、BBOX、筛选命中缓存；
- 筛选变化不误命中；
- 数据集变化清缓存；
- 容量达到上限后淘汰旧项；
- 缓存结果不能被调用方修改。

### 11.4 Feature Diff

- 新增、删除、更新、未变化计数；
- 坐标更新保留 Feature 身份；
- type/status/level 更新刷新属性；
- 离开视口的选中事件清理；
- Cluster/Heatmap 继续引用同一 Source。

### 11.5 用户手动验收

- 首次进入页面只加载视口内数据；
- 快速连续拖动不会被旧响应回滚；
- 返回相同视口出现缓存命中；
- 数据量切换后重新建索引并刷新；
- 筛选、列表、统计和地图保持一致；
- 空视口、失败和重试状态明确；
- Region 查询明确只针对当前视口结果；
- 页面卸载后不再有请求或地图回调。

## 12. 性能证据原则

实现只提供测量能力，不写固定收益。交付时必须区分：

- 已测量：当前运行得到的具体阶段耗时；
- 理论收益：候选集缩小、Diff 降低对象重建、缓存减少重复查询；
- 待验证：FPS、内存、GC、P95、不同设备表现。

未经用户手动在固定环境记录，不得宣称空间分桶或 Feature Diff 提升了具体百分比。

## 13. 依赖与公共 API

本阶段不新增第三方依赖。空间分桶、缓存和请求控制使用 TypeScript 与浏览器原生 API。

Package 公共入口仅导出宿主真正需要的稳定协议。Mock Service 是否导出取决于是否需要外部替换；默认建议导出 `ViewportEventService` 接口和工厂，不导出内部 Grid Index 实现。

依赖方向保持：

```text
GisManagementDemo
→ Viewport Query Controller
→ ViewportEventService 接口
→ MockViewportEventService

GisManagementDemo
→ MapManager
→ OpenLayers
```

Service 不依赖 MapManager，MapManager 不依赖 Service。

## 14. 文档更新

实施完成后需要同步：

- `packages/openlayers-gis-demo/README.md`：功能与运行说明；
- `packages/openlayers-gis-demo/DEVELOPMENT.md`：真实数据流和视口语义；
- `GIS-简历真实技术亮点.md`：仅在验证源码后增加真实能力；
- `GIS-个人技术原理与面试手册.md`：更新视口加载、缓存、竞态与 Diff；
- 本设计对应的实施计划状态。

## 15. 完成标准

- 完整 Mock 数据集只由 Service 持有；
- 地图首次加载和 moveend 都通过 WGS84 BBOX 查询；
- 快速连续操作不会提交旧响应；
- 相同查询可命中有界缓存；
- 正常视口响应使用 Feature ID Diff；
- 当前视口语义在列表、统计、导出和区域查询中清晰一致；
- 所有新增非页面测试通过；
- 相关 TypeScript、Lint 和 Vite 构建在用户授权执行后通过；
- 不执行 Webpack；
- 页面交互由用户按手动步骤验证；
- 不编造性能指标。

