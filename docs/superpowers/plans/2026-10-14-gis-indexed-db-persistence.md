# GIS IndexedDB Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将固定且具包含关系的 1k～100k GIS 数据量级完整保存到 IndexedDB，并让用户新增、覆盖导入、编辑、删除、处置、区域和附件操作在对应量级中持久化。

**Architecture:** `GisManagementDemo.vue` 只依赖 Feature 内 `GisApi`；`LocalGisApi` 编排完整事件内存快照、空间索引和 `GisDatasetRepository`；Repository 通过 `@blog/indexed-db` 在单个 `blog-gis` 数据库中使用 `settings` 与 `dataset:*` namespace。事件按稳定 ID 哈希分为 128 个 shard，所有 UI 更新采用“持久化成功后提交内存状态”的写穿语义。

**Tech Stack:** Vue 3.5.13、TypeScript 5.6.3、Pinia 3.0.1、OpenLayers 10.10.0、Vitest 3.2.4、`@blog/indexed-db@2.0.0`

**Spec:** `docs/superpowers/specs/2026-10-14-gis-indexed-db-persistence-design.md`

## Global Constraints

- 用户已在当前任务中准确回复 `允许添加测试代码`，授权范围仅限本计划的 GIS IndexedDB 接入测试。
- 自动执行非页面测试、类型检查、Lint 和 Vite 构建仍需用户单独确认；页面操作和交互验收始终由用户手动完成。
- 禁止执行任何 Webpack 命令。
- 不新增模拟 IndexedDB 或其他第三方依赖；测试使用 `@blog/indexed-db` 的 Memory 降级实现和必要的故障注入 Adapter。
- 增加精确 Workspace 依赖 `"@blog/indexed-db": "workspace:2.0.0"`；运行 `pnpm install --filter @blog/openlayers-gis-demo` 前必须单独取得安装确认。
- 不修改 `apps/web/**`；若实施发现必须增加应用级装配，停止当前任务并补充设计与规则记录。
- `GisDatasetScale` 固定为 `'1k' | '10k' | '50k' | '100k'`，默认量级固定为 `10k`。
- 数据库固定为 `blog-gis`，settings namespace 固定为 `settings`，数据 namespace 固定为 `dataset:${scale}`。
- 事件 shard 数量固定为 128；哈希必须跨运行环境稳定，业务不得依赖 shard 内顺序。
- 完整数据不得进入 Pinia 或 OpenLayers Source；Pinia 和地图仍只保存当前视口结果。
- 用户修改必须在持久化成功后才提交内存、索引、缓存和 UI 状态。
- 混合更新与逻辑删除通过 `setMany` 和显式 `null` 墓碑原子提交，不扩展 `@blog/indexed-db` 公共 API。
- 新增布局只使用 Flexbox 和媒体查询，禁止 CSS Grid。
- 复杂持久化边界、状态、错误、坐标、容量、时间和墓碑语义必须使用准确的简体中文注释。

## Review Focus

1. 首次初始化 100k 数据发生配额或 clone 失败：不得留下可被下次误判为完整数据集的 metadata；测试初始化失败后重试。
2. 两个 Repository 实例先后修改同一 shard：第一版采用页面单写实例约束，关闭旧实例后必须拒绝写入；测试旧实例关闭语义。
3. 导入文件同时包含已有 ID、新 ID、非法 Feature 和文件内重复 ID：有效项原子 upsert，统计分类准确；测试混合输入。
4. 删除带责任人、活动、区域引用和多个 Blob 附件的事件：一个业务事务写入 shard、metadata、regions 与全部墓碑；测试跨实例恢复后无残留业务引用。
5. IndexedDB 运行时降级到 Memory：状态通知必须传到页面且不能假装复制旧持久数据；测试 Local API 状态转发并在 README 说明刷新丢失风险。

---

### Task 1: 数据量级协议与固定 Mock 包含关系

**Files:**

- Create: `packages/openlayers-gis-demo/src/persistence/dataset-scale.ts`
- Create: `packages/openlayers-gis-demo/src/persistence/dataset-scale.test.ts`
- Modify: `packages/openlayers-gis-demo/src/mock/generate-events.ts`
- Modify: `packages/openlayers-gis-demo/src/viewport/mock-viewport-event-service.test.ts`
- Modify: `packages/openlayers-gis-demo/src/index.ts`

**Interfaces:**

- Produces: `GisDatasetScale`、`GIS_DATASET_SCALES`、`GIS_DATASET_SIZE_BY_SCALE`、`DEFAULT_GIS_DATASET_SCALE`、`getDatasetSize(scale)`。
- Preserves: `generateInspectionEvents(count): InspectionEvent[]` 公共签名。

- [ ] **Step 1: 写入数据量级映射与默认值的失败测试**

断言四个量级按 `1k/10k/50k/100k` 顺序映射为 `1_000/10_000/50_000/100_000`，未知运行时输入由类型守卫拒绝，默认值为 `10k`。

- [ ] **Step 2: 运行目标测试并确认 RED**

Run: `pnpm --filter @blog/openlayers-gis-demo test -- src/persistence/dataset-scale.test.ts`

Expected: FAIL，原因是数据量级模块尚不存在，而不是测试配置或导入错误。

- [ ] **Step 3: 实现数据量级协议**

在 `dataset-scale.ts` 定义固定联合类型、只读量级列表、精确数值映射、默认量级和运行时缩窄函数；为数量单位和默认语义补充简体中文注释。

- [ ] **Step 4: 写入固定 Mock 包含关系的失败测试**

在现有 Mock Service 测试中断言：`generateInspectionEvents(1_000)` 严格等于 `generateInspectionEvents(10_000).slice(0, 1_000)`，并对 10k→50k、50k→100k 的边界事件 ID 与内容做抽样断言。

- [ ] **Step 5: 运行测试并确认因 count 参与随机种子而 RED**

Run: `pnpm --filter @blog/openlayers-gis-demo test -- src/viewport/mock-viewport-event-service.test.ts`

Expected: FAIL，首批相同 ID 的坐标或业务字段不一致。

- [ ] **Step 6: 将 Mock 生成器改为与 count 无关的固定种子**

保持事件 ID、固定基准时间和边界规范不变，只让相同索引的伪随机序列跨量级一致。

- [ ] **Step 7: 运行 Task 1 测试并确认 GREEN**

Run: `pnpm --filter @blog/openlayers-gis-demo test -- src/persistence/dataset-scale.test.ts src/viewport/mock-viewport-event-service.test.ts`

Expected: PASS，无警告。

- [ ] **Step 8: 更新公共入口并完整检查触碰文件**

只导出数据量级公共协议，不导出内部随机函数；检查数量单位、包含关系注释和现有 Viewport Service 行为无额外变化。

- [ ] **Step 9: 提交 Task 1**

```bash
git add packages/openlayers-gis-demo/src/persistence/dataset-scale.ts packages/openlayers-gis-demo/src/persistence/dataset-scale.test.ts packages/openlayers-gis-demo/src/mock/generate-events.ts packages/openlayers-gis-demo/src/viewport/mock-viewport-event-service.test.ts packages/openlayers-gis-demo/src/index.ts
git commit -m "feat: define gis dataset scales"
```

---

### Task 2: Settings 与完整事件分片 Repository

**Files:**

- Modify: `packages/openlayers-gis-demo/package.json`
- Modify: `pnpm-lock.yaml`（只允许由获准后的 pnpm 安装生成）
- Create: `packages/openlayers-gis-demo/src/persistence/types.ts`
- Create: `packages/openlayers-gis-demo/src/persistence/event-shards.ts`
- Create: `packages/openlayers-gis-demo/src/persistence/gis-settings-repository.ts`
- Create: `packages/openlayers-gis-demo/src/persistence/gis-dataset-repository.ts`
- Create: `packages/openlayers-gis-demo/src/persistence/gis-dataset-repository.test.ts`

**Interfaces:**

- Consumes: Task 1 数据量级协议、`generateInspectionEvents`、`mockInspectionRegions`、`@blog/indexed-db` 公共 API。
- Produces: `GisDatasetMetadata`、`PersistedGisDataset`、`GisSettingsRepository`、`GisDatasetRepository`。

- [ ] **Step 1: 请求 Workspace 依赖安装许可**

向用户展示并等待确认：

```bash
pnpm install --filter @blog/openlayers-gis-demo
```

确认后先在 `package.json` 增加 `"@blog/indexed-db": "workspace:2.0.0"`，再执行上述命令，只允许 pnpm 更新对应 importer/link。未确认时停止 Task 2，不修改依赖或手工伪造锁文件。

- [ ] **Step 2: 写入稳定 shard 哈希的失败测试**

测试同一事件 ID 始终映射到闭区间 `[0, 127]` 的同一整数，边界与高位 Unicode ID 不越界，全部事件可分片后无丢失地合并。

- [ ] **Step 3: 运行 shard 测试并确认 RED**

Run: `pnpm --filter @blog/openlayers-gis-demo test -- src/persistence/gis-dataset-repository.test.ts`

Expected: FAIL，原因是分片工具与 Repository 尚不存在。

- [ ] **Step 4: 定义持久化协议和 shard 工具**

固定 `GIS_FIXTURE_VERSION = 1`、`GIS_EVENT_SHARD_COUNT = 128`。事件 shard Key 使用三位十进制编号；稳定哈希只处理字符串码元并明确输出范围。

- [ ] **Step 5: 写入 settings 与首次初始化失败测试**

使用唯一测试 databaseName 创建真实 Memory 降级 Store，断言：无设置时为 `10k`；保存后跨 Repository 实例恢复；首次 `1k` 初始化写入 metadata、128 个 shard 和预设区域；第二次初始化保留手工写入的事件内容而不重新生成。

- [ ] **Step 6: 实现 Settings 与 Dataset Repository 初始化/读取**

建议构造签名：

```ts
class GisSettingsRepository {
  static create(options?: { databaseName?: string }): Promise<GisSettingsRepository>
  getActiveScale(): Promise<GisDatasetScale>
  setActiveScale(scale: GisDatasetScale): Promise<void>
  get state(): StorageRuntimeState
  close(): void
}

class GisDatasetRepository {
  static create(scale: GisDatasetScale, options?: { databaseName?: string }): Promise<GisDatasetRepository>
  loadOrInitialize(): Promise<PersistedGisDataset>
  get state(): StorageRuntimeState
  close(): void
}
```

生产默认 databaseName 固定为 `blog-gis`；测试专用 databaseName 只用于隔离 Memory Registry。

- [ ] **Step 7: 写入初始化失败后重试测试**

通过只在首次 `setMany` 抛错的故障注入 KeyValueStore 断言：失败时没有可被读取为完整数据集的 metadata；再次初始化能够生成完整数据。

- [ ] **Step 8: 实现 fixture 版本重建与失败安全**

版本不一致时先清空当前 dataset namespace，再用单个 `setMany` 写入全部新数据；metadata 与全部 shard 同批提交。setMany 失败时 namespace 没有 metadata，下次进入重新初始化。

- [ ] **Step 9: 运行 Task 2 测试并确认 GREEN**

Run: `pnpm --filter @blog/openlayers-gis-demo test -- src/persistence/gis-dataset-repository.test.ts`

Expected: PASS，首次初始化、恢复、版本重建、namespace 隔离和失败重试全部通过。

- [ ] **Step 10: 完整检查 Task 2 触碰文件并提交**

检查依赖精确版本、公开协议注释、128 shard 容量语义、Memory 状态和 close 后行为。

```bash
git add packages/openlayers-gis-demo/package.json pnpm-lock.yaml packages/openlayers-gis-demo/src/persistence
git commit -m "feat: persist gis dataset shards"
```

---

### Task 3: 用户业务数据、墓碑与原子 Repository 操作

**Files:**

- Modify: `packages/openlayers-gis-demo/src/persistence/types.ts`
- Modify: `packages/openlayers-gis-demo/src/persistence/gis-dataset-repository.ts`
- Modify: `packages/openlayers-gis-demo/src/persistence/gis-dataset-repository.test.ts`
- Modify: `packages/openlayers-gis-demo/src/types/inspection-event.ts`
- Create: `packages/openlayers-gis-demo/src/types/event-evidence.ts`

**Interfaces:**

- Produces Repository methods: `addEvent`、`updateEvent`、`removeEvent`、`setAssignee`、`advanceEventStatus`、`advanceEventStatuses`、`saveRegions`、`addAttachment`、`removeAttachment`、`loadEventDetails`。
- Defines: `EventEvidenceMetadata`（不包含页面 Blob URL）、`PersistedEventDetails`。

- [ ] **Step 1: 写入事件新增、编辑和跨实例恢复的失败测试**

断言新增写入正确 shard 并增加 `currentEventCount`；编辑覆盖事件字段但不改变数量；关闭并重建 Repository 后结果仍存在。

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter @blog/openlayers-gis-demo test -- src/persistence/gis-dataset-repository.test.ts`

Expected: FAIL，Repository 尚无写入方法。

- [ ] **Step 3: 实现单事件写穿方法**

每次操作读取并复制目标 shard，通过一个 `setMany` 同时写入 shard 与 metadata；成功后才更新 Repository 内存快照。

- [ ] **Step 4: 写入处置、分派、活动和区域失败测试**

断言状态机只允许 `PENDING → PROCESSING → DONE`；分派与状态变化追加稳定活动；区域保存/修改/删除仅影响当前量级；批量状态推进跨多个 shard 后全部恢复。

- [ ] **Step 5: 实现业务辅助数据原子写入**

活动 ID 使用现有事件活动协议且跨刷新继续递增，不能基于当前视口数组长度。批量状态推进按 shard 聚合，并将所有 shard 与活动 Key 放入一个 `setMany`。

- [ ] **Step 6: 写入删除级联与附件墓碑失败测试**

为同一事件准备责任人、活动、区域引用和两个 Blob；删除后跨实例恢复，断言事件不存在、metadata 数量减少、区域引用已清理、辅助值与 Blob 墓碑被解释为不存在。

- [ ] **Step 7: 实现事件/附件删除墓碑协议**

使用显式 `null` 覆盖辅助 Key 与 Blob Key，并在读取层统一忽略；不得用 `undefined`。单附件删除同时更新元数据列表并写入 Blob 墓碑。

- [ ] **Step 8: 写入持久化失败不提交内存的测试**

故障注入 Adapter 在 setMany 抛错后，断言 Repository 当前事件、数量和详情快照保持原值。

- [ ] **Step 9: 运行 Task 3 测试并确认 GREEN**

Run: `pnpm --filter @blog/openlayers-gis-demo test -- src/persistence/gis-dataset-repository.test.ts`

Expected: PASS，用户业务写入、批量事务、墓碑、跨实例恢复和失败不提交全部通过。

- [ ] **Step 10: 完整检查并提交 Task 3**

重点检查 Blob 不进入错误消息、时间单位/ISO 格式、墓碑联合类型成员注释和坐标类型不被放宽。

```bash
git add packages/openlayers-gis-demo/src/persistence packages/openlayers-gis-demo/src/types
git commit -m "feat: persist gis business mutations"
```

---

### Task 4: GeoJSON 覆盖导入与 Local GIS API

**Files:**

- Modify: `packages/openlayers-gis-demo/src/services/export-events.ts`
- Create: `packages/openlayers-gis-demo/src/services/export-events.test.ts`
- Create: `packages/openlayers-gis-demo/src/api/types.ts`
- Create: `packages/openlayers-gis-demo/src/api/local-gis-api.ts`
- Create: `packages/openlayers-gis-demo/src/api/local-gis-api.test.ts`
- Modify: `packages/openlayers-gis-demo/src/viewport/mock-viewport-event-service.ts`
- Modify: `packages/openlayers-gis-demo/src/viewport/mock-viewport-event-service.test.ts`
- Modify: `packages/openlayers-gis-demo/src/index.ts`

**Interfaces:**

- Consumes: Task 2/3 Repository 与现有 `ViewportEventService`。
- Produces: `GisApi`、`LocalGisApi`、`GisApiState`、`GisEventImportResult`。

- [ ] **Step 1: 写入 GeoJSON 分类解析失败测试**

构造同时包含合法事件、非法 Feature 和文件内重复 ID 的输入；断言解析结果分别返回有效事件、`invalidCount` 和 `duplicateInFileCount`，不再只返回无法区分原因的 `rejectedCount`。

- [ ] **Step 2: 运行解析测试确认 RED**

Run: `pnpm --filter @blog/openlayers-gis-demo test -- src/services/export-events.test.ts`

Expected: FAIL，现有结果没有分类统计。

- [ ] **Step 3: 实现分类解析协议**

根协议错误继续抛 TypeError；文件内首次出现的合法 ID进入 events，后续重复项只增加 duplicateInFileCount。

- [ ] **Step 4: 写入导入 upsert 的失败测试**

初始化小数据集后导入一个已有 ID 和一个新 ID；断言已有事件基础字段被覆盖、新事件加入、其他事件保留、责任人/活动/附件保留，并返回 `addedCount = 1`、`overwrittenCount = 1`。

- [ ] **Step 5: 实现 Repository `importEvents` 原子 upsert**

按目标 shard 合并全部事件，通过一个 setMany 写入受影响 shard 与 metadata；任一写入失败时内存快照不改变。

- [ ] **Step 6: 写入 Local API 初始化、查询和缓存失效失败测试**

断言 Local API 从持久化事件构建空间索引；事件新增/覆盖/删除后旧缓存不再返回陈旧结果；storage state 与 dataset scale/size 可读取；close 后操作失败。

- [ ] **Step 7: 让 Viewport Service 接收恢复后的事件快照**

新增明确方法或构造参数接收 `readonly InspectionEvent[]`，保留现有 `setDatasetSize` 仅供兼容测试或将其收敛为内部生成入口；Local API 不再按 count 隐式重建用户数据。

- [ ] **Step 8: 实现 `GisApi` 与 `LocalGisApi`**

GisApi 的业务写方法返回提交后的实体或结果；页面无需直接操作 Repository。运行时 Memory 降级通过状态订阅向上传递，不复制旧 IndexedDB 数据。

- [ ] **Step 9: 运行 Task 4 测试并确认 GREEN**

Run: `pnpm --filter @blog/openlayers-gis-demo test -- src/services/export-events.test.ts src/api/local-gis-api.test.ts src/viewport/mock-viewport-event-service.test.ts`

Expected: PASS，导入分类、覆盖语义、索引恢复、缓存失效和关闭行为全部通过。

- [ ] **Step 10: 完整检查并提交 Task 4**

检查公共 API 不泄漏 `KeyValueStore`、shard、namespace 或 IndexedDB 类型；未来 HttpGisApi 可实现同一业务协议。

```bash
git add packages/openlayers-gis-demo/src/services packages/openlayers-gis-demo/src/api packages/openlayers-gis-demo/src/viewport packages/openlayers-gis-demo/src/index.ts
git commit -m "feat: add local gis persistence api"
```

---

### Task 5: GIS 页面异步初始化与数据量级下拉框

**Files:**

- Modify: `packages/openlayers-gis-demo/src/components/GisManagementDemo.vue`
- Modify: `packages/openlayers-gis-demo/src/stores/gis.ts`
- Modify: `packages/openlayers-gis-demo/src/vue.d.ts`（仅在新增类型声明确有需要时）

**Interfaces:**

- Consumes: Task 4 `GisApi`/`LocalGisApi`。
- Preserves: `GisManagementDemo` 对应用的现有 props 与公开入口。

- [ ] **Step 1: 将页面业务修改入口改为异步 API 写穿**

新增、编辑、删除、状态推进、批量推进、分派、区域和导入都先 await GisApi；成功后刷新当前视口或提交返回结果。Pinia 不直接决定持久化成功。

- [ ] **Step 2: 将附件页面类型拆分为持久化 metadata + Blob URL ViewModel**

添加附件时先调用 API 保存 Blob，成功后创建 URL；恢复时从 API 读取 Blob 后创建 URL；删除先持久化，成功后撤销 URL。

- [ ] **Step 3: 改造页面挂载顺序**

`onMounted` 先初始化 LocalGisApi 和恢复数据，再创建 ViewportQueryController/MapManager。初始化期间显示状态；失败时不构建半成品地图数据，并提供重试入口。

- [ ] **Step 4: 添加标题右侧数据量级下拉框**

下拉框值使用 `GisDatasetScale`。选择目标后先写 settings，成功后调用 `window.location.reload()`；失败时恢复原选项且不刷新。下拉框位于标题右侧、主导航之前。

- [ ] **Step 5: 移除底部数据量按钮并显示存储状态**

底部 performance controls 只保留空间交互与渲染模式；标题区域在 Memory 状态显示刷新丢失提示。所有布局使用 Flexbox。

- [ ] **Step 6: 更新导入反馈**

展示新增、覆盖、非法和文件内重复数量；不再把现有 ID 作为冲突跳过。

- [ ] **Step 7: 完整检查组件与 Store**

人工检查所有触碰方法的错误分支、加载禁用、页面卸载顺序、Blob URL 释放、公开协议注释和 CSS Grid 禁令。确认 Store 仍只保存当前视口与会话状态。

- [ ] **Step 8: 提交 Task 5**

```bash
git add packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/stores/gis.ts packages/openlayers-gis-demo/src/vue.d.ts
git commit -m "feat: connect gis workspace to local persistence"
```

页面交互由用户稍后按 Task 6 清单手动验证，Agent 不启动页面或操作浏览器。

---

### Task 6: 文档、完整验证与交付

**Files:**

- Modify: `packages/openlayers-gis-demo/README.md`
- Modify: `docs/superpowers/plans/2026-10-14-gis-indexed-db-persistence.md`
- Modify: 仅限 Task 1～5 验证暴露的本批问题文件

**Interfaces:**

- Consumes: 最终公共 API、实际测试输出和用户手动页面反馈。
- Produces: 可复核的架构说明、存储结构、降级语义和验证记录。

- [ ] **Step 1: 更新 README**

说明数据量级、包含关系、`blog-gis`/namespace、128 shard、首次初始化、刷新恢复、导入覆盖、Memory 降级、配额错误、页面切换行为和未来 HttpGisApi 边界。

- [ ] **Step 2: 请求并执行非页面验证许可**

若用户允许 Agent 自动执行，运行：

```bash
pnpm --filter @blog/openlayers-gis-demo test
pnpm --filter @blog/openlayers-gis-demo typecheck
pnpm lint
pnpm build:vite
```

Expected: 全部退出码 0、无测试失败。用户不允许时不得执行，并提供同样命令供用户手动运行。

- [ ] **Step 3: 执行非运行型规则检查**

```bash
git diff --check
rg -n "display\s*:\s*(inline-)?grid|grid-template-|grid-column|grid-row|grid-area" packages/openlayers-gis-demo/src
rg -n '"(\^|~)|latest' packages/openlayers-gis-demo/package.json
```

Expected: diff 无空白错误；本批未新增 Grid；新依赖是精确 Workspace 版本。

- [ ] **Step 4: 提供用户页面手动验收清单**

1. 首次进入默认 10k，标题右侧显示下拉框。
2. 切换 1k/50k/100k 后刷新并保留选择。
3. 新增、编辑、删除、分派、状态推进、区域与附件刷新后保持。
4. 导入同时覆盖已有 ID 和新增 ID，其他事件保持。
5. 不同量级中的用户修改互相隔离。
6. DevTools 中只有 `blog-gis/entries`，无四个物理数据库。
7. Memory 降级提示和配额失败提示符合设计。

- [ ] **Step 5: 记录实际结果并完成全文件诊断审查**

在本计划末尾记录依赖安装、测试、typecheck、Lint、Vite、页面手动验证和所有未验证项。逐项检查所有触碰文件的完整诊断、实现逻辑、公开协议、中文注释、时间/容量/坐标/墓碑语义和 CSS Grid。

- [ ] **Step 6: 提交 Task 6**

```bash
git add packages/openlayers-gis-demo/README.md docs/superpowers/plans/2026-10-14-gis-indexed-db-persistence.md pnpm-lock.yaml
git commit -m "docs: document gis local persistence"
```

提交前核对暂存区，只包含 README、实施计划、锁文件和验证实际修正的明确文件；验证修正必须逐个追加路径，禁止用宽泛目录暂存。

---

## Final Review Checklist

- [ ] 标题右侧使用数据量级下拉框，刷新后保留最后选择。
- [ ] `1k ⊂ 10k ⊂ 50k ⊂ 100k`，相同 ID 跨量级内容一致。
- [ ] 完整 Mock 数据首次写入 IndexedDB，后续刷新不覆盖用户修改。
- [ ] 一个 `blog-gis` 数据库使用 settings 与四个 dataset namespace。
- [ ] 事件固定分为 128 shard，新增/编辑/删除只重写受影响 shard。
- [ ] 新增、编辑、删除、状态、分派、区域和附件均写入当前量级。
- [ ] 导入已有 ID 覆盖、新 ID 新增、其他事件保留。
- [ ] 删除级联使用 `null` 墓碑保持业务原子性。
- [ ] 持久化失败时内存、索引、Pinia 和地图不提前更新。
- [ ] 完整数据不进入 Pinia 或 OpenLayers Source。
- [ ] Memory 降级与配额错误不会误导用户。
- [ ] 关闭旧 API/Repository 后禁止继续写入。
- [ ] 公共入口不导出 Repository 内部 Key、shard 或 IndexedDB 类型。
- [ ] 新增测试均按 TDD 观察 RED→GREEN，且获准执行的最终套件通过。
- [ ] 所有触碰文件完成完整诊断和公开协议/中文注释人工审查。
- [ ] 页面验证由用户手动完成，Agent 未操作浏览器或执行 Webpack。
- [ ] 本批自有前端样式未新增或保留触碰区域内的 CSS Grid。
