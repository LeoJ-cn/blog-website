# GIS Viewport Loading Implementation Plan

> **执行方式：** 按 Task 顺序逐项实施并记录完成状态。若当前运行环境支持计划执行或独立 Review 能力，可以使用，但这些能力不是执行本计划的前置条件。

**Goal:** 为 `@blog/openlayers-gis-demo` 增加可替换的异步 Mock BBOX 数据服务、经纬度分桶索引、请求取消与竞态保护、有界缓存和 OpenLayers Feature ID Diff，使地图只持有当前视口事件。

**Architecture:** 完整 1k～100k Mock 数据集由框架无关的 `MockViewportEventService` 独占，通过 WGS84 BBOX 和业务筛选返回当前视口事件；Vue 侧的 Query Controller 负责取消、竞态和状态，`MapManager` 只负责视口协议与 Event Source Diff。Service 不依赖 Vue/OpenLayers，MapManager 不依赖 Service，Event、Cluster、Heatmap 继续共享一个 Event Source。

**Tech Stack:** Vue 3.5.13、TypeScript 5.6.3、Pinia 3.0.1、OpenLayers 10.10.0、Vitest 3.2.4、Vite 6.0.11、pnpm Workspace

**Spec:** `docs/superpowers/specs/2026-10-11-gis-viewport-loading-design.md`

## Global Constraints

- 只修改 `packages/openlayers-gis-demo/**`、必要的 `apps/web/**` Package 接入及本计划列出的文档；不得顺带重构其他 Demo。
- 不新增运行时第三方依赖；测试依赖必须使用精确版本 `vitest: "3.2.4"`。
- 安装或更新依赖前必须先向用户给出准确命令并等待确认。
- 用户已允许本阶段新增和修改非页面测试代码；页面操作、浏览器调试和性能体验由用户手动完成。
- 非页面测试可以按本计划执行；类型检查、Lint 和 Vite 构建在最终执行前再次向用户确认。
- 不执行任何 Webpack 开发、构建、分析或基准命令。
- 不使用 CSS Grid；若触碰的现有样式区域包含 Grid，必须在同一修改中迁移为 Flexbox。
- 所有 BBOX、坐标、时间、缓存容量和统计字段必须使用简体中文注释说明顺序、单位、范围和边界语义。
- 不把固定网格索引描述为 R-tree，不把当前视口结果描述为完整数据集，不编造性能提升比例。
- 每个 Task 结束前检查该 Task 所有触碰文件的完整诊断、公开协议注释和业务边界。
- 不自动操作浏览器；手动验收步骤只提供给用户执行。

## Review Focus

1. **BBOX 边界与非法范围：** 位于最小/最大经纬度边界的点必须包含；`min > max`、NaN 和 Infinity 必须明确拒绝，由 Task 1 测试固定。
2. **缓存量化不能漏数据：** 量化后的缓存范围必须覆盖真实 BBOX，缓存返回前必须按真实 BBOX 精筛，由 Task 2 测试固定。
3. **取消与竞态：** Abort 不能显示为错误，旧响应和旧数据集版本不能覆盖最新请求，由 Task 3 测试固定。
4. **Feature Diff 身份与选择清理：** 未变化/更新 Feature 保持身份，离开视口的选中事件必须清除 Selection、Popup 和 Vue 选择，由 Task 4、5 测试固定。
5. **当前视口语义：** 列表、统计、区域查询和导出不得误称全量，失败时保留旧结果，空结果与错误分开，由 Task 6 测试和人工审查固定。

---

## File Structure

### 新增文件

- `packages/openlayers-gis-demo/src/viewport/types.ts`：WGS84 BBOX、服务查询、数据集构建、查询指标和状态协议。
- `packages/openlayers-gis-demo/src/viewport/spatial-grid-index.ts`：固定经纬度网格索引与 BBOX 候选查询。
- `packages/openlayers-gis-demo/src/viewport/mock-viewport-event-service.ts`：确定性数据集、筛选、异步取消和有界缓存。
- `packages/openlayers-gis-demo/src/viewport/viewport-query-controller.ts`：AbortController、request ID、最新参数、重试和查询状态。
- `packages/openlayers-gis-demo/src/viewport/viewport-state.ts`：框架无关的视口结果归并与业务状态清理规则。
- `packages/openlayers-gis-demo/src/map/sources/sync-event-source.ts`：按事件 ID Diff Event Source。
- `packages/openlayers-gis-demo/src/viewport/*.test.ts`：网格、Service 和 Controller 单元测试。
- `packages/openlayers-gis-demo/src/map/sources/sync-event-source.test.ts`：Feature Diff 单元测试。
- `packages/openlayers-gis-demo/vitest.config.ts`：GIS Package 的 Node 环境测试配置。

### 修改文件

- `packages/openlayers-gis-demo/package.json`：精确 Vitest 开发依赖和 `test` 脚本。
- `packages/openlayers-gis-demo/src/map/MapManager.ts`：视口 BBOX、视口回调、Source Diff、选择失效通知和指标。
- `packages/openlayers-gis-demo/src/stores/gis.ts`：当前视口事件替换及选择一致性。
- `packages/openlayers-gis-demo/src/components/GisManagementDemo.vue`：服务/控制器装配、状态、指标、重试与文案。
- `packages/openlayers-gis-demo/src/index.ts`：只导出稳定的视口服务协议和工厂。
- `packages/openlayers-gis-demo/README.md`：视口加载功能和手动验证。
- `packages/openlayers-gis-demo/DEVELOPMENT.md`：真实数据流、当前视口语义和实现边界。
- `packages/openlayers-gis-demo/GIS-简历真实技术亮点.md`：仅加入最终源码可证明的能力。
- `packages/openlayers-gis-demo/GIS-个人技术原理与面试手册.md`：视口加载、竞态、缓存和 Diff 原理。
- `docs/superpowers/plans/2026-10-11-gis-viewport-loading.md`：勾选完成项和记录实际验证结果。

---

### Task 1: 测试基础、BBOX 协议与空间分桶索引

**Files:**

- Modify: `packages/openlayers-gis-demo/package.json`
- Create: `packages/openlayers-gis-demo/vitest.config.ts`
- Create: `packages/openlayers-gis-demo/src/viewport/types.ts`
- Create: `packages/openlayers-gis-demo/src/viewport/spatial-grid-index.ts`
- Create: `packages/openlayers-gis-demo/src/viewport/spatial-grid-index.test.ts`
- Modify: `pnpm-lock.yaml`（仅在用户批准安装后）

**Interfaces:**

- Consumes: `InspectionEvent`、`InspectionEventFilter`、现有 `generateInspectionEvents(count)`。
- Produces:
  - `type Wgs84Bbox = readonly [number, number, number, number]`
  - `interface SpatialGridIndexOptions { cellSizeDegrees: number }`
  - `class SpatialGridIndex`
  - `constructor(events: readonly InspectionEvent[], options: SpatialGridIndexOptions)`
  - `queryCandidates(bbox: Wgs84Bbox): readonly InspectionEvent[]`
  - `getCellCount(): number`
  - `validateWgs84Bbox(bbox: Wgs84Bbox): void`
  - `isEventInsideBbox(event: InspectionEvent, bbox: Wgs84Bbox): boolean`

- [ ] **Step 1: 请求测试依赖安装许可**

向用户说明需要为 GIS Package 增加精确开发依赖，等待确认后才能执行：

```bash
pnpm --filter @blog/openlayers-gis-demo add -D vitest@3.2.4
```

预期：用户批准后才执行；未批准时停止依赖安装和测试运行，不修改锁文件。

- [ ] **Step 2: 添加 Package 测试入口**

在 `package.json` 增加：

```json
"test": "vitest run --config vitest.config.ts"
```

创建 `vitest.config.ts`，使用 Node 环境，只包含 `src/**/*.test.ts`。不配置浏览器或 jsdom。

- [ ] **Step 3: 编写 BBOX 协议失败测试**

测试名称与断言：

- `includes events on every bbox boundary`：四条边和角点都返回 true；
- `rejects reversed longitude or latitude bounds`：`minLng > maxLng` 或 `minLat > maxLat` 抛 `RangeError`；
- `rejects non-finite bbox values`：NaN/Infinity 抛 `TypeError`；
- `rejects coordinates outside WGS84 bounds`：经度超 `[-180,180]` 或纬度超 `[-90,90]` 抛 `RangeError`。

- [ ] **Step 4: 编写空间分桶失败测试**

测试名称与断言：

- `returns only candidates from intersecting cells`；
- `supports negative longitude and latitude cell keys`；
- `deduplicates candidates across queried cells`；
- `matches linear bbox scan for deterministic 1000-event dataset`；
- `rejects non-positive cellSizeDegrees`。

- [ ] **Step 5: 运行定向测试并确认 RED**

Run:

```bash
pnpm --filter @blog/openlayers-gis-demo test -- src/viewport/spatial-grid-index.test.ts
```

Expected: FAIL，原因是协议和索引模块尚未实现。

- [ ] **Step 6: 实现 BBOX 类型、校验和固定网格索引**

`types.ts` 为所有 tuple、耗时、容量和计数字段补充简体中文注释。`SpatialGridIndex` 构造时只建立一次桶映射，查询只返回相交桶候选，不在该类中应用业务筛选。

固定 `DEFAULT_CELL_SIZE_DEGREES = 0.01`，并注释这是城市演示分桶参数，不代表通用 GIS 最优值。

- [ ] **Step 7: 运行定向测试并确认 GREEN**

Run: Task 1 Step 5 的命令。

Expected: PASS，测试数量与文件内用例一致，无 skipped。

- [ ] **Step 8: 检查 Task 1 完整诊断与差异**

检查 `types.ts`、索引实现、测试、配置和 package manifest 的完整诊断；确认没有浮动依赖、没有 Vue/OpenLayers import、没有 CSS 变更。

- [ ] **Step 9: 提交 Task 1**

```bash
git add packages/openlayers-gis-demo/package.json packages/openlayers-gis-demo/vitest.config.ts packages/openlayers-gis-demo/src/viewport/types.ts packages/openlayers-gis-demo/src/viewport/spatial-grid-index.ts packages/openlayers-gis-demo/src/viewport/spatial-grid-index.test.ts pnpm-lock.yaml
git commit -m "test: establish gis viewport query foundation"
```

---

### Task 2: Mock BBOX Service、筛选和有界缓存

**Files:**

- Create: `packages/openlayers-gis-demo/src/viewport/mock-viewport-event-service.ts`
- Create: `packages/openlayers-gis-demo/src/viewport/mock-viewport-event-service.test.ts`
- Modify: `packages/openlayers-gis-demo/src/viewport/types.ts`

**Interfaces:**

- Consumes: Task 1 的 `Wgs84Bbox`、`SpatialGridIndex`、`validateWgs84Bbox`、`isEventInsideBbox` 和 `generateInspectionEvents`。
- Produces:
  - `interface ViewportEventQuery { bbox; filter; signal? }`
  - `interface ViewportDatasetBuildStats { datasetSize; datasetVersion; generationDurationMs; indexBuildDurationMs; indexedCellCount }`
  - `interface ViewportEventQueryResult { events; datasetSize; datasetVersion; candidateCount; matchedCount; queryDurationMs; cacheHit }`
  - `interface ViewportEventService { setDatasetSize; query; clearCache; destroy }`
  - `interface MockViewportEventServiceOptions { latencyMs?: number; cacheCapacity?: number; cellSizeDegrees?: number }`
  - `createMockViewportEventService(initialCount, options?): ViewportEventService`

- [ ] **Step 1: 编写数据集和筛选失败测试**

覆盖：

- `setDatasetSize builds deterministic dataset and increments version`；
- `query matches linear scan with keyword type status and level filters`；
- `matchedCount equals returned event count`；
- `candidateCount is never smaller than matchedCount`；
- `setDatasetSize clears prior cache and returns build timings`；
- `rejects duplicate IDs from an injected dataset factory`（允许测试通过 options 注入数据工厂，生产默认仍使用现有生成器）。

- [ ] **Step 2: 编写缓存边界失败测试**

覆盖：

- 相同版本、真实 BBOX 和筛选第二次查询 `cacheHit=true`；
- 筛选不同不命中；
- BBOX 量化缓存仍对真实 BBOX 再精筛，不返回真实范围外事件；
- 超过 `cacheCapacity` 后最久未使用条目被淘汰；
- 调用方修改返回数组不污染下一次缓存结果；
- `cacheCapacity <= 0` 明确拒绝。

- [ ] **Step 3: 编写异步取消失败测试**

使用 fake timers 或受控 Promise 覆盖：

- 查询开始前已 abort 立即拒绝 `AbortError`；
- 模拟延迟期间 abort 拒绝 `AbortError`；
- `destroy` 后新查询拒绝明确错误；
- abort 查询不写入缓存。

- [ ] **Step 4: 运行定向测试并确认 RED**

```bash
pnpm --filter @blog/openlayers-gis-demo test -- src/viewport/mock-viewport-event-service.test.ts
```

Expected: FAIL，原因是 Service 尚未实现。

- [ ] **Step 5: 实现数据集、查询、LRU 和 Abort**

使用 `Map` 的访问顺序实现有界 LRU。缓存项保存向外扩张后的量化 BBOX候选结果，返回前始终使用真实 BBOX 和当前筛选精确过滤。所有返回数组创建副本。

AbortError 使用 `DOMException('查询已取消', 'AbortError')`；若运行环境缺少 DOMException，则使用具名 Error 兼容测试运行时，并保持 `name === 'AbortError'`。

- [ ] **Step 6: 运行定向测试并确认 GREEN**

Run: Task 2 Step 4 的命令。

Expected: PASS，无定时器或未处理 Promise 泄漏。

- [ ] **Step 7: 检查 Task 2 完整诊断与差异**

确认 Service 不依赖 Vue/OpenLayers，不暴露内部桶结构，不把模拟 latency 计入 `queryDurationMs` 的纯查询耗时，缓存容量和延迟单位有注释。

- [ ] **Step 8: 提交 Task 2**

```bash
git add packages/openlayers-gis-demo/src/viewport/types.ts packages/openlayers-gis-demo/src/viewport/mock-viewport-event-service.ts packages/openlayers-gis-demo/src/viewport/mock-viewport-event-service.test.ts
git commit -m "feat: add mock gis bbox service"
```

---

### Task 3: Viewport Query Controller 请求治理

**Files:**

- Create: `packages/openlayers-gis-demo/src/viewport/viewport-query-controller.ts`
- Create: `packages/openlayers-gis-demo/src/viewport/viewport-query-controller.test.ts`
- Modify: `packages/openlayers-gis-demo/src/viewport/types.ts`

**Interfaces:**

- Consumes: Task 2 的 `ViewportEventService`、`ViewportEventQuery`、`ViewportEventQueryResult`。
- Produces:
  - `type ViewportQueryStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'`
  - `interface ViewportQueryParams { bbox; filter; expectedDatasetVersion }`
  - `interface ViewportQueryState { status; result; errorMessage; requestId }`
  - `interface ViewportQueryControllerOptions { service; onStateChange }`
  - `class ViewportQueryController`
  - `query(params: ViewportQueryParams): Promise<void>`
  - `retry(): Promise<void>`
  - `cancel(): void`
  - `destroy(): void`

- [ ] **Step 1: 编写取消和状态失败测试**

覆盖：

- 首次 query 先发 `loading`，成功后为 `success`；
- 空 events 为 `empty`；
- 新 query 调用旧 AbortController.abort；
- Abort 不产生 `error`，不清除上一成功 result；
- 普通错误进入 `error` 并保留上一成功 result。

- [ ] **Step 2: 编写竞态和数据集切换失败测试**

覆盖：

- 第二请求先完成后，第一请求晚到不得覆盖；
- 即使 Service 忽略 Abort，request ID 仍阻止旧提交；
- 返回的 datasetVersion 与发起时预期版本不一致时不提交；
- destroy 后状态不再回调。

- [ ] **Step 3: 编写重试失败测试**

覆盖：

- `retry` 使用最后一次 BBOX 和筛选；
- 没有历史参数时 retry 不调用 Service；
- retry 同样遵循新 request ID 和取消规则。

- [ ] **Step 4: 运行定向测试并确认 RED**

```bash
pnpm --filter @blog/openlayers-gis-demo test -- src/viewport/viewport-query-controller.test.ts
```

Expected: FAIL，原因是 Controller 尚未实现。

- [ ] **Step 5: 实现 Controller**

Controller 使用普通 TypeScript，不直接创建 Vue ref。`expectedDatasetVersion` 由调用方在 `setDatasetSize` 返回构建结果后保存，并随每次查询显式传入；Controller 只提交返回版本与预期版本一致的结果。`onStateChange` 每次返回不可变快照，由组件决定如何接入 Vue。错误消息只暴露安全字符串，保留原 Error 仅供内部调试，不作为公共状态协议。

- [ ] **Step 6: 运行定向测试并确认 GREEN**

Run: Task 3 Step 4 的命令。

Expected: PASS。

- [ ] **Step 7: 检查 Task 3 完整诊断与差异**

确认 Abort、错误、空结果、旧响应、retry、destroy 均有唯一状态语义；公开联合类型每个成员有简体中文注释。

- [ ] **Step 8: 提交 Task 3**

```bash
git add packages/openlayers-gis-demo/src/viewport/types.ts packages/openlayers-gis-demo/src/viewport/viewport-query-controller.ts packages/openlayers-gis-demo/src/viewport/viewport-query-controller.test.ts
git commit -m "feat: govern gis viewport requests"
```

---

### Task 4: Event Source Feature ID Diff

**Files:**

- Create: `packages/openlayers-gis-demo/src/map/sources/sync-event-source.ts`
- Create: `packages/openlayers-gis-demo/src/map/sources/sync-event-source.test.ts`
- Modify: `packages/openlayers-gis-demo/src/map/sources/create-event-source.ts`

**Interfaces:**

- Consumes: `EventFeature`、`createEventFeature`、`updateEventFeature`、`InspectionEvent`。
- Produces:
  - `interface EventSourceDiffStats { added; updated; removed; unchanged; durationMs; removedSelectedEventId }`
  - `syncEventSource(source, events, selectedEventId?): EventSourceDiffStats`
  - `hasEventFeatureChanged(feature, event): boolean`

- [ ] **Step 1: 编写 Diff 计数失败测试**

覆盖：

- 空 Source 添加两条：`added=2`；
- 删除离开视口事件：`removed=1`；
- 完全相同事件：`unchanged=1` 且保持同一个 Feature 引用；
- status/type/level/坐标任一变化：`updated=1` 且保持 Feature 引用；
- 新旧集合混合时所有计数总和正确。

- [ ] **Step 2: 编写选择和非法数据失败测试**

覆盖：

- selected ID 被删除时返回 `removedSelectedEventId`；
- selected ID 仍存在时返回 null；
- 新结果中重复 ID 抛明确错误，不静默覆盖；
- Feature 缺少字符串 ID 时按无效旧 Feature 删除，不进入更新路径。

- [ ] **Step 3: 运行定向测试并确认 RED**

```bash
pnpm --filter @blog/openlayers-gis-demo test -- src/map/sources/sync-event-source.test.ts
```

Expected: FAIL，原因是 Diff 模块尚未实现。

- [ ] **Step 4: 实现属性比较与 Source Diff**

只比较进入 Feature 的 type/status/level 和投影后坐标。使用一次新结果 Map；收集删除列表后再调用 `removeFeatures` 或逐个 remove，新增列表一次 `addFeatures`。不得调用 `source.clear()`。

- [ ] **Step 5: 运行定向测试并确认 GREEN**

Run: Task 4 Step 3 的命令。

Expected: PASS，并确认未变化/更新 Feature 身份断言通过。

- [ ] **Step 6: 检查 Task 4 完整诊断与差异**

确认耗时单位、计数范围、重复 ID 和选择删除语义均有注释；不得为比较创建新的 OpenLayers Map 或 Layer。

- [ ] **Step 7: 提交 Task 4**

```bash
git add packages/openlayers-gis-demo/src/map/sources/create-event-source.ts packages/openlayers-gis-demo/src/map/sources/sync-event-source.ts packages/openlayers-gis-demo/src/map/sources/sync-event-source.test.ts
git commit -m "feat: diff gis event source by id"
```

---

### Task 5: MapManager 视口协议和 Diff 接入

**Files:**

- Modify: `packages/openlayers-gis-demo/src/map/MapManager.ts`
- Create: `packages/openlayers-gis-demo/src/map/viewport-bbox.ts`
- Create: `packages/openlayers-gis-demo/src/map/viewport-bbox.test.ts`
- Modify: `packages/openlayers-gis-demo/src/index.ts`

**Interfaces:**

- Consumes: Task 1 的 `Wgs84Bbox`，Task 4 的 `syncEventSource/EventSourceDiffStats`。
- Produces:
  - `MapManagerOptions.onViewportChange?: (bbox: Wgs84Bbox) => void`
  - `MapManagerOptions.onEventSelectInvalidated?: (eventId: string) => void`
  - `getViewportBbox(): Wgs84Bbox | null`
  - `syncEvents(events): EventSourceDiffStats`
  - `MapStats.eventSourceDiff: EventSourceDiffStats | null`
  - `calculateWgs84ViewportBbox(projectedExtent, projectionCode): Wgs84Bbox`

- [ ] **Step 1: 编写视口转换失败测试**

覆盖：

- EPSG:3857 extent 转换为预期 WGS84 BBOX；
- 输出顺序固定为 `[minLng,minLat,maxLng,maxLat]`；
- 输出限制在合法经纬度；
- 非有限或反向 extent 明确拒绝；
- 不在测试中创建浏览器 Map。

- [ ] **Step 2: 运行视口转换测试并确认 RED**

```bash
pnpm --filter @blog/openlayers-gis-demo test -- src/map/viewport-bbox.test.ts
```

Expected: FAIL，原因是转换模块尚未实现。

- [ ] **Step 3: 实现纯视口转换函数**

使用 OpenLayers `transformExtent`，公开协议只返回 WGS84 tuple。对上海演示范围不处理跨日期变更线；转换后反向范围抛错。

- [ ] **Step 4: 接入 mount 和 moveend 视口通知**

`mount` 在 `setTarget/updateSize` 后通过微任务或首个 rendercomplete 发出一次有效 BBOX；`moveend` 只在量化前原始 BBOX 确实变化时通知。不得在 pointermove 中通知。

- [ ] **Step 5: 接入 syncEvents 和选择失效**

`syncEvents` 调用 Task 4 模块；若选中 ID 被删除，清除 Selection/Popup，并触发 `onEventSelectInvalidated`。保留 `setEvents` 作为初始化和数据集重置路径。

- [ ] **Step 6: 扩展 MapStats**

保留现有 featureConversion/sourceUpdate/renderComplete 字段，新增 `eventSourceDiff`。Diff 更新后将 `renderCompleteMs` 设为 null，并记录本批渲染起点。

- [ ] **Step 7: 运行 Map 定向测试和 GIS 全部测试**

```bash
pnpm --filter @blog/openlayers-gis-demo test
```

Expected: 全部 PASS，无浏览器环境依赖错误。

- [ ] **Step 8: 检查 Task 5 完整诊断与公共 API**

检查 `MapManager.ts` 全文件诊断和协议注释；确认没有把 Map/View/Extent 暴露给 Vue，Event/Cluster/Heatmap 仍共享原 Source。

- [ ] **Step 9: 提交 Task 5**

```bash
git add packages/openlayers-gis-demo/src/map/MapManager.ts packages/openlayers-gis-demo/src/map/viewport-bbox.ts packages/openlayers-gis-demo/src/map/viewport-bbox.test.ts packages/openlayers-gis-demo/src/index.ts
git commit -m "feat: expose gis viewport loading boundary"
```

---

### Task 6: Vue/Pinia 视口数据流、状态和性能面板

**Files:**

- Modify: `packages/openlayers-gis-demo/src/stores/gis.ts`
- Modify: `packages/openlayers-gis-demo/src/components/GisManagementDemo.vue`
- Modify: `packages/openlayers-gis-demo/src/index.ts`
- Create: `packages/openlayers-gis-demo/src/viewport/viewport-state.ts`
- Create: `packages/openlayers-gis-demo/src/viewport/viewport-state.test.ts`

**Interfaces:**

- Consumes: Task 2 Service、Task 3 Controller、Task 5 MapManager viewport/sync API。
- Produces:
  - Store `replaceViewportEvents(events)`
  - 页面 `queryViewport(bbox)` 与 `retryViewportQuery()`
  - 当前数据集/视口/候选/缓存/Diff 指标 UI
  - 当前视口导出语义

- [ ] **Step 1: 提取并测试视口页面状态归并函数**

为避免直接测试 3,700 行 Vue 组件，创建框架无关的 `viewport-state` 辅助函数并覆盖：

- success/empty 替换当前事件；
- error 保留旧事件；
- 选择事件不在新结果中时清理；
- 区域 eventIds 与当前视口取交集；
- 数据集切换清理选择、区域结果和页码。

- [ ] **Step 2: 运行 viewport-state 测试并确认 RED**

```bash
pnpm --filter @blog/openlayers-gis-demo test -- src/viewport/viewport-state.test.ts
```

Expected: FAIL，原因是状态归并模块尚未实现。

- [ ] **Step 3: 实现 Store 当前视口替换协议**

Pinia 不再持有完整数据集。`replaceViewportEvents` 只替换当前视口数组，并清理失效业务 ID；已有单事件 CRUD 保持会话内语义，但必须明确它只作用于当前已加载事件。

- [ ] **Step 4: 在组件装配 Service 和 Controller**

`onMounted` 顺序：创建 Service → `setDatasetSize` 并保存返回的 `datasetVersion` → 创建 Controller → 创建空数据 MapManager → mount → 接收初始 BBOX → 携带预期版本查询。`onBeforeUnmount`：先 destroy Controller/Service，再销毁 MapManager 和 Blob URL。

- [ ] **Step 5: 改造数据量和筛选流程**

- 数据量切换调用 Service `setDatasetSize`、清空地图、重查当前 BBOX；
- 筛选变化直接重查当前 BBOX，不再对完整数据做 Pinia computed 过滤；
- 快速拖动只由 Controller 最新请求提交；
- 当前区域在视口结果更新后重新计算；
- 选中项离开视口时同步清除详情。

- [ ] **Step 6: 更新统计、列表和导出语义**

所有统计和分页以当前视口事件为输入。导出按钮和文件说明明确“当前视口结果”；不得暗示导出完整数据集。当前完整数据集规模只显示 Service stats。

- [ ] **Step 7: 增加查询与 Diff 状态 UI**

使用现有 Flexbox 布局区域，不新增 CSS Grid。展示：loading/empty/error/retry、datasetSize、candidateCount、matchedCount、cacheHit、generation/index/query/diff/renderComplete 耗时和 added/updated/removed。

- [ ] **Step 8: 运行 GIS 全部非页面测试**

```bash
pnpm --filter @blog/openlayers-gis-demo test
```

Expected: 全部 PASS。

- [ ] **Step 9: 检查 Task 6 全部触碰文件诊断**

完整检查 `GisManagementDemo.vue` 与 `stores/gis.ts`，不能只过滤新增行。检查公开状态、错误、缓存、时间和计数字段注释；检查触碰样式没有 CSS Grid。

- [ ] **Step 10: 提交 Task 6**

```bash
git add packages/openlayers-gis-demo/src/stores/gis.ts packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/index.ts packages/openlayers-gis-demo/src/viewport/viewport-state.test.ts packages/openlayers-gis-demo/src/viewport/viewport-state.ts
git commit -m "feat: load gis events by viewport"
```

---

### Task 7: 文档、最终验证与用户手动验收

**Files:**

- Modify: `packages/openlayers-gis-demo/README.md`
- Modify: `packages/openlayers-gis-demo/DEVELOPMENT.md`
- Modify: `packages/openlayers-gis-demo/GIS-简历真实技术亮点.md`
- Modify: `packages/openlayers-gis-demo/GIS-个人技术原理与面试手册.md`
- Modify: `docs/superpowers/plans/2026-10-11-gis-viewport-loading.md`
- Modify: 仅限 Task 1～6 验证暴露的本批问题文件

**Interfaces:**

- Consumes: Task 1～6 的完整视口加载能力和实际验证结果。
- Produces: 与源码一致的项目说明、面试材料、验证记录和用户手动验收步骤。

- [ ] **Step 1: 更新 README 和 DEVELOPMENT**

记录完整数据集只在 Service、Pinia/地图只持有当前视口、Region 只查询当前已加载事件、缓存/竞态/Diff 实现及生产后端替换边界。

- [ ] **Step 2: 更新简历亮点和面试手册**

只加入源码已实现能力；明确固定网格是 Mock Service，不是生产数据库索引。没有实际测量结果时继续标记“待验证”，不得写提升百分比。

- [ ] **Step 3: 运行 GIS 全部测试**

```bash
pnpm --filter @blog/openlayers-gis-demo test
```

Expected: 全部 PASS、0 skipped、0 unhandled rejection。

- [ ] **Step 4: 请求最终非页面验证许可**

向用户询问是否允许自动执行：

```bash
pnpm --filter @blog/openlayers-gis-demo typecheck
pnpm lint
pnpm build:vite
```

未获许可时不执行，并在交付中提供命令、预期结果和“未验证”状态。不得执行 Webpack。

- [ ] **Step 5: 在获许可后运行完整验证**

Expected:

- GIS typecheck 退出码 0；
- ESLint 退出码 0；
- Vite build 退出码 0；
- `git diff --check` 退出码 0。

若发现非本批引入的问题，报告位置、现象、影响和建议，取得确认前不扩大范围。本批引入的问题直接修复并重新验证。

- [ ] **Step 6: 提供用户手动页面验收**

用户运行：

```bash
pnpm dev:vite
```

访问 `/playground/solutions/openlayers-gis`，依次验证：

1. 首屏显示 loading 后只加载当前视口事件；
2. 快速连续平移/缩放后结果对应最终视口；
3. 返回相同视口出现 cache hit；
4. 1k/10k/50k/100k 切换重建索引并刷新；
5. 筛选、列表、统计、地图数量一致；
6. 当前选择移出视口后详情和 Popup 清除；
7. Polygon/Circle 只统计当前视口事件；
8. 导出文件只包含当前视口结果；
9. 模拟错误后旧地图保留且重试可恢复；
10. 离开页面后不再出现请求、RAF 或回调。

- [ ] **Step 7: 记录实际结果并完成规则检查**

在本计划末尾记录测试数量、类型检查/Lint/Vite 结果、未执行项和用户页面反馈。逐项检查根 `AGENTS.md` 完成清单，包括完整诊断、协议注释、坐标/时间/容量语义、测试权限、Webpack 禁令和 CSS Grid 禁令。

- [ ] **Step 8: 提交文档与最终修正**

```bash
git add packages/openlayers-gis-demo docs/superpowers/plans/2026-10-11-gis-viewport-loading.md
git commit -m "docs: document gis viewport loading"
```

提交前必须核对暂存区，避免包含用户未授权的其他工作区改动。

---

## Final Review Checklist

- [ ] Service、Controller、MapManager 依赖方向符合设计。
- [ ] 完整数据集不进入 Pinia 或 Event Source。
- [ ] 初始视口、moveend、数据量、筛选和 retry 均能触发正确查询。
- [ ] Abort、request ID 和 datasetVersion 三层竞态保护均有测试。
- [ ] 缓存有界，量化不漏数据，返回值不会污染缓存。
- [ ] 正常查询使用 Feature Diff；数据集切换才允许整体清空。
- [ ] 离开视口的选中项、Popup、区域结果和详情保持一致。
- [ ] Event、Cluster、Heatmap 仍共享同一 Source。
- [ ] 当前视口与完整数据集的 UI 文案不存在歧义。
- [ ] 新增公开协议成员均有简体中文语义注释。
- [ ] 所有触碰文件完整诊断已检查。
- [ ] 未新增 CSS Grid。
- [ ] 未执行 Webpack。
- [ ] 未编造性能指标。
- [ ] 页面验证由用户执行并明确记录结果。
