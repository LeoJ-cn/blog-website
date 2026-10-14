# GIS 空间分析工作台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 GIS 工作台中加入测距、面积、缓冲区、最近事件、区域统计和区域对比，并按当前数据量级持久化分析记录。

**Architecture:** 使用纯 TypeScript `SpatialAnalysisService` 承担球面计算和统计，`SpatialAnalysisController` 编排页面状态，`LocalGisApi` 在完整非响应式事件快照上执行候选查询与持久化，`AnalysisLayerManager` 只负责 OpenLayers 地图表达。Vue 与 Pinia 不持有完整事件集合或 OpenLayers 对象。

**Tech Stack:** Vue 3.5.13、TypeScript 5.6.3、Pinia 3.0.1、OpenLayers 10.10.0、`@blog/indexed-db@workspace:2.0.0`、Vite 6.0.11

**Spec:** `docs/superpowers/specs/2026-10-14-gis-spatial-analysis-workbench-design.md`

**Implementation status:** Task 1～6 已实现并按任务提交；Task 7 已完成文档、全量静态诊断和手动验收交付。用户明确要求不写测试代码，因此本计划未创建或修改测试文件。

## Global Constraints

- 用户明确要求不新增、修改或生成任何测试代码；本计划不包含 TDD，不触碰现有 `*.test.ts`。
- 非页面类自动检查必须在实施前重新取得用户许可；未获许可时只提供命令，由用户执行并反馈。
- 页面测试、浏览器操作和交互验证只能由用户手动完成。
- 只允许 Vite 验证；禁止执行任何 Webpack 命令。
- 仓库自有前端样式禁止使用 CSS Grid，布局使用 Flexbox、允许的定位和媒体查询。
- 不新增第三方依赖；所有计算使用当前 TypeScript 与 OpenLayers 能力。
- 距离单位固定为米，面积单位固定为平方米，WGS84 坐标顺序固定为 `[经度, 纬度]`。
- 完整事件集合不得进入 Pinia、Vue 深层响应式对象或 OpenLayers Source。
- 所有持久化操作遵循写穿语义：IndexedDB 成功后才提交 Controller、Pinia 和地图状态。
- 保存的分析记录按 `dataset:*` namespace 隔离；`datasetVersion` 不一致时只读展示并要求重新执行。
- 实施前保留并隔离与本计划无关的未提交 favicon 修改，不得混入 GIS 提交。

## Review Focus

由于用户禁止测试代码，以下高风险输入由实现审查和用户手动验收覆盖，不创建自动化用例：

1. 跨 180° 经线 Polygon 必须返回明确不支持错误，不能产生错误面积或命中结果。
2. 空 Polygon、未闭合环、非正缓冲半径和最近事件数量超出 1～100 必须在执行前拒绝。
3. 数据量级切换或连续分析时，旧 request ID 的结果不得覆盖新结果。
4. 分析记录 `datasetVersion` 过期时可以查看，但禁止静默覆盖保存。
5. 高亮命中超过 2,000 条时只展示边界与统计，不能把完整结果灌入 OpenLayers Source。

---

### Task 1: 空间分析公共协议与球面基础计算

**Files:**

- Create: `packages/openlayers-gis-demo/src/types/spatial-analysis.ts`
- Create: `packages/openlayers-gis-demo/src/services/spatial-analysis/measurement.ts`
- Create: `packages/openlayers-gis-demo/src/services/spatial-analysis/geometry-validation.ts`
- Create: `packages/openlayers-gis-demo/src/services/spatial-analysis/buffer.ts`
- Create: `packages/openlayers-gis-demo/src/services/spatial-analysis/index.ts`
- Modify: `packages/openlayers-gis-demo/src/index.ts`

**Interfaces:**

- Produces `SpatialAnalysisKind`、`AnalysisGeometry`、`SpatialAnalysisInput`、`SpatialAnalysisResult`、`SpatialAnalysisFailureReason`。
- Produces `calculateHaversineDistanceMeters(from, to)`、`calculateLineLengthMeters(coordinates)`、`calculateSphericalPolygonAreaSquareMeters(rings)`、`calculatePolygonPerimeterMeters(rings)`。
- Produces `createWgs84BufferPolygon(center, radiusMeters, segmentCount = 64)`。
- Produces `validateAnalysisGeometry(geometry)`，失败返回稳定原因，不解析错误文案。

- [ ] **Step 1: 定义完整公共联合类型**

为每个分析类型、失败原因、几何成员、距离/面积单位、坐标顺序与边界语义编写简体中文注释。`SpatialAnalysisResult` 按 `kind` 判别，结果只保存事件 ID，不复制事件对象。

- [ ] **Step 2: 实现几何输入校验**

拒绝非有限坐标、越界经纬度、少于两个点的 LineString、少于四点或首尾不闭合的 Polygon、非正 Circle 半径和跨 180° 经线 Polygon。

- [ ] **Step 3: 实现测距、周长和球面面积**

地球平均半径固定为 `6_371_008.8` 米；多段线按相邻点求和；Polygon 外环面积减去洞面积，最终结果不得为负数。

- [ ] **Step 4: 实现缓冲区 Polygon**

按球面目标点公式生成 64 个等角度采样点，并追加首点闭合；自定义 `segmentCount` 必须是大于或等于 16 的整数。

- [ ] **Step 5: 人工协议审查**

逐项核对公开联合类型成员、失败原因、米/平方米单位、WGS84 顺序、环闭合和 180° 边界；不得用 `string` 或 `number[]` 放宽已知协议。

- [ ] **Step 6: 可选非页面检查**

用户允许自动执行时运行：

```bash
pnpm --filter @blog/openlayers-gis-demo typecheck
pnpm exec eslint packages/openlayers-gis-demo/src/types/spatial-analysis.ts packages/openlayers-gis-demo/src/services/spatial-analysis packages/openlayers-gis-demo/src/index.ts
```

预期：退出码均为 0。未获许可时将命令交给用户执行。

- [ ] **Step 7: 提交 Task 1**

```bash
git add packages/openlayers-gis-demo/src/types/spatial-analysis.ts packages/openlayers-gis-demo/src/services/spatial-analysis packages/openlayers-gis-demo/src/index.ts
git commit -m "feat: add gis spatial analysis primitives"
```

---

### Task 2: 完整数据集上的分析查询与风险统计

**Files:**

- Create: `packages/openlayers-gis-demo/src/services/spatial-analysis/event-analysis.ts`
- Create: `packages/openlayers-gis-demo/src/services/spatial-analysis/risk-score.ts`
- Create: `packages/openlayers-gis-demo/src/services/spatial-analysis/spatial-analysis-service.ts`
- Modify: `packages/openlayers-gis-demo/src/services/spatial-analysis/index.ts`
- Modify: `packages/openlayers-gis-demo/src/viewport/spatial-grid-index.ts`

**Interfaces:**

- Consumes Task 1 `AnalysisGeometry`、测量与校验函数。
- Produces `SpatialAnalysisService.execute(input, context): Promise<SpatialAnalysisResult>`。
- Produces `SpatialGridIndex.queryNearestCandidates(point, limit)` 或等价的有界候选方法，不向页面暴露索引内部桶结构。
- Produces `calculateEventRiskScore(event, nowTimestamp)`，权重固定为状态 `3/2/0`、等级 `5/3/1`、超时额外 `+4`。

- [ ] **Step 1: 扩展空间索引候选查询**

从目标点所在网格开始按环扩大候选范围，达到足够候选或全球边界后停止；最终距离排序由 Service 完成，索引不承担业务权重。

- [ ] **Step 2: 实现最近事件分析**

限制返回数量为闭区间 `[1, 100]`；使用 Haversine 精排；距离相同时按事件 ID 码元升序；结果包含事件 ID 与距离米数。

- [ ] **Step 3: 实现区域包含与统计**

先以 WGS84 BBOX 查询候选，再执行 Polygon/Circle 精筛；返回事件 ID、类型/状态/等级计数、风险总分和高风险事件 ID。

- [ ] **Step 4: 实现区域对比**

分别得到区域 A/B 的事件 ID Set，返回 `onlyAEventIds`、`sharedEventIds`、`onlyBEventIds` 及两侧统计；输出 ID 使用稳定码元顺序。

- [ ] **Step 5: 实现 2,000 条高亮上限协议**

结果保留完整命中 ID，但单独返回 `highlightEventIds`，最多 2,000 条；超限时设置 `highlightTruncated: true`。

- [ ] **Step 6: 完整实现与协议审查**

检查空结果、全球范围、边界点包含、圆半径单位、SLA 时间单位、稳定排序与风险评分免责声明。

- [ ] **Step 7: 可选非页面检查并提交**

获许可后运行 Package typecheck 与触碰文件 ESLint；随后只暂存本任务文件：

```bash
git add packages/openlayers-gis-demo/src/services/spatial-analysis packages/openlayers-gis-demo/src/viewport/spatial-grid-index.ts
git commit -m "feat: add gis event analysis engine"
```

---

### Task 3: 分析记录持久化与 GisApi 扩展

**Files:**

- Modify: `packages/openlayers-gis-demo/src/persistence/types.ts`
- Modify: `packages/openlayers-gis-demo/src/persistence/gis-dataset-repository.ts`
- Modify: `packages/openlayers-gis-demo/src/api/types.ts`
- Modify: `packages/openlayers-gis-demo/src/api/local-gis-api.ts`
- Modify: `packages/openlayers-gis-demo/src/index.ts`

**Interfaces:**

- Consumes Task 1/2 分析输入、结果与 `SpatialAnalysisService`。
- Produces `PersistedSpatialAnalysis`、`SpatialAnalysisSummary`、`SpatialAnalysisSaveResult`。
- Adds `GisApi.executeSpatialAnalysis(input)`、`listSpatialAnalyses()`、`loadSpatialAnalysis(id)`、`saveSpatialAnalysis(record)`、`removeSpatialAnalysis(id)`。

- [ ] **Step 1: 定义持久化协议**

记录包含稳定 ID、名称、kind、input、result、`datasetScale`、`datasetVersion`、`createdAt`、`updatedAt`。摘要不得包含完整事件 ID 集合。

- [ ] **Step 2: 实现 Repository Key 与摘要索引**

使用当前 `dataset:*` namespace 的 `analyses:index` 与 `analysis:<analysisId>`；摘要按 `updatedAt` 降序，时间相同时按 ID 码元升序。

- [ ] **Step 3: 实现原子保存、重命名和删除**

记录与摘要索引用同一个 `setMany`；删除把记录写为显式 `null` 墓碑并更新摘要索引；失败时内存状态不改变。

- [ ] **Step 4: 实现 LocalGisApi 分析执行**

Service 直接使用 Local API 的完整非响应式事件快照和空间索引，不调用 Pinia 或当前视口结果。API 关闭后全部分析操作失败。

- [ ] **Step 5: 实现数据版本失效保护**

载入旧版本记录时返回 `stale: true`；允许查看和另存为新记录，但覆盖保存必须先重新执行得到当前 `datasetVersion`。

- [ ] **Step 6: 审查公共入口**

确认 `src/index.ts` 只导出业务 API 和协议，不导出 Repository Key、namespace、shard 或 `KeyValueStore` 类型。

- [ ] **Step 7: 可选非页面检查并提交**

获许可后运行 Package typecheck、触碰文件 ESLint 和 `git diff --check`：

```bash
git add packages/openlayers-gis-demo/src/persistence/types.ts packages/openlayers-gis-demo/src/persistence/gis-dataset-repository.ts packages/openlayers-gis-demo/src/api/types.ts packages/openlayers-gis-demo/src/api/local-gis-api.ts packages/openlayers-gis-demo/src/index.ts
git commit -m "feat: persist gis spatial analyses"
```

---

### Task 4: 分析 Controller、地图图层与绘制交互

**Files:**

- Create: `packages/openlayers-gis-demo/src/analysis/spatial-analysis-controller.ts`
- Create: `packages/openlayers-gis-demo/src/map/layers/create-analysis-layers.ts`
- Create: `packages/openlayers-gis-demo/src/map/analysis-layer-manager.ts`
- Modify: `packages/openlayers-gis-demo/src/map/LayerManager.ts`
- Modify: `packages/openlayers-gis-demo/src/map/MapManager.ts`
- Modify: `packages/openlayers-gis-demo/src/map/interactions/SpatialInteractionManager.ts`
- Modify: `packages/openlayers-gis-demo/src/index.ts`

**Interfaces:**

- Consumes Task 1 `AnalysisGeometry`、Task 3 `GisApi` 分析方法。
- Produces `SpatialAnalysisController` 状态机与 `SpatialAnalysisControllerState`。
- Adds MapManager methods `startAnalysisDrawing(kind)`、`showAnalysisInput(geometry)`、`showAnalysisResult(result)`、`clearActiveAnalysis()`、`setAnalysisHighlightEvents(events)`。

- [ ] **Step 1: 实现 Controller 状态机**

状态为 `idle | drawing | ready | running | success | error`；保存输入快照和递增 request ID；旧请求完成时不得提交。

- [ ] **Step 2: 创建三个分析图层**

`analysisInput`、`analysisResult`、`analysisHighlight` 使用独立 VectorSource；样式分别表达输入、结果和命中，不改写事件 Feature。

- [ ] **Step 3: 扩展 LayerManager 协议**

为三个 Layer ID 补充逐成员中文语义；确保显隐、销毁和重复 ID 防护沿用现有实现。

- [ ] **Step 4: 扩展绘制交互**

分析绘制与 Select/Draw/Modify 互斥；返回序列化 WGS84 Point/LineString/Polygon/Circle，不向组件返回 Feature 或 Geometry 实例。

- [ ] **Step 5: 扩展 MapManager**

统一拥有分析 Source、Feature 和交互监听；结果高亮只接收最多 2,000 个当前可显示事件；`destroy()` 完整清理图层、Overlay 和监听。

- [ ] **Step 6: 生命周期审查**

人工检查反复进入/退出分析场景、取消绘制、切换数据量级、页面卸载和 Map 未 mount 场景；不得残留 Interaction 或请求回调。

- [ ] **Step 7: 可选非页面检查并提交**

获许可后运行 Package typecheck、触碰文件 ESLint 与 CSS Grid 扫描：

```bash
git add packages/openlayers-gis-demo/src/analysis packages/openlayers-gis-demo/src/map packages/openlayers-gis-demo/src/index.ts
git commit -m "feat: add gis analysis map layers"
```

---

### Task 5: 空间分析场景与结果面板

**Files:**

- Modify: `packages/openlayers-gis-demo/src/components/GisManagementDemo.vue`
- Modify: `packages/openlayers-gis-demo/src/stores/gis.ts`

**Interfaces:**

- Consumes Task 3 `GisApi` 分析方法和 Task 4 Controller/MapManager 命令。
- Preserves `GisManagementDemo` 现有 props 与宿主公共入口。

- [ ] **Step 1: 添加“空间分析”主场景**

在现有三个场景之后新增导航项；复用当前 MapManager，切换时取消未提交绘制但保留已保存结果。

- [ ] **Step 2: 添加左侧分析工具**

使用明确按钮提供测距、测面积、缓冲区、最近事件、区域统计和区域对比；运行期间禁用会改变输入的操作。

- [ ] **Step 3: 添加参数与结果面板**

参数显示单位和范围；结果分别展示米/km、平方米/km²、事件数量、状态、等级、类型、风险分和高亮截断提示。

- [ ] **Step 4: 接入 Controller 与写穿保存**

执行成功后才展示结果；保存成功后才更新已保存分析列表；删除需要二次确认；持久化失败保留当前未保存结果。

- [ ] **Step 5: 恢复与过期提示**

初始化只加载分析摘要；用户打开记录时再加载详情。过期记录显示“数据已变化”，禁用覆盖保存并提供“重新执行”。

- [ ] **Step 6: 收敛 Pinia 状态**

Pinia 只保存当前活动分析 ID、工具、参数和轻量结果摘要；不得保存完整事件集合、OpenLayers 对象或 Blob URL。

- [ ] **Step 7: 布局与错误分支审查**

触碰区域全部使用 Flexbox；检查 loading、empty、error、Memory 降级、2,000 条截断、快速切换工具和卸载分支。

- [ ] **Step 8: 可选非页面检查并提交**

获许可后运行 Package typecheck、触碰文件 ESLint、CSS Grid 扫描和 Vite 构建：

```bash
git add packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/stores/gis.ts
git commit -m "feat: add gis spatial analysis workspace"
```

---

### Task 6: 分析 GeoJSON 导入导出

**Files:**

- Create: `packages/openlayers-gis-demo/src/services/spatial-analysis/analysis-geojson.ts`
- Modify: `packages/openlayers-gis-demo/src/components/GisManagementDemo.vue`
- Modify: `packages/openlayers-gis-demo/src/index.ts`

**Interfaces:**

- Produces `serializeSpatialAnalysisToGeoJson(record)`。
- Produces `parseSpatialAnalysisGeoJson(input)`，返回合法记录草稿、`invalidCount` 和 `duplicateInFileCount`。
- Consumes Task 3 `saveSpatialAnalysis`；导入时始终生成新本地 ID。

- [ ] **Step 1: 定义分析 GeoJSON 协议**

geometry 保存输入或结果几何；properties 保存名称、kind、datasetScale、时间和轻量统计；大型事件 ID 集合不写入单个 Feature properties。

- [ ] **Step 2: 实现序列化**

所有坐标输出为 WGS84；Circle 输出为采样后的 Polygon，并在 properties 保留原中心和半径米数。

- [ ] **Step 3: 实现不可信输入解析**

根协议错误抛 TypeError；单 Feature 错误计入 `invalidCount`；文件内重复源 ID 只保留首次；拒绝未知 kind、非有限坐标和错误单位。

- [ ] **Step 4: 接入页面导入导出**

导入前展示文件大小限制；解析后使用新 ID 保存到当前量级；反馈新增、非法和文件内重复数量；导出后及时释放 Blob URL。

- [ ] **Step 5: 可选非页面检查并提交**

获许可后运行 Package typecheck、触碰文件 ESLint 和 Vite 构建：

```bash
git add packages/openlayers-gis-demo/src/services/spatial-analysis/analysis-geojson.ts packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/index.ts
git commit -m "feat: import and export gis analyses"
```

---

### Task 7: 文档、完整诊断与用户验收交付

**Files:**

- Modify: `packages/openlayers-gis-demo/README.md`
- Modify: `docs/superpowers/plans/2026-10-14-gis-spatial-analysis-workbench.md`
- Modify: 仅限 Task 1～6 验证直接暴露的本批问题文件

**Interfaces:**

- Consumes: 最终公共 API、实际静态检查结果和用户页面反馈。
- Produces: 架构说明、算法精度边界、单位说明、持久化结构和验收记录。

- [ ] **Step 1: 更新 README**

说明六类空间分析、状态机、三个分析图层、风险评分、2,000 条高亮上限、IndexedDB Key、数据版本失效、GeoJSON 和算法精度限制。

- [ ] **Step 2: 取得最终非页面检查许可**

只有用户明确允许后才自动运行：

```bash
pnpm --filter @blog/openlayers-gis-demo typecheck
pnpm lint
pnpm build:vite
git diff --check
rg -n "display\s*:\s*(inline-)?grid|grid-template-|grid-column|grid-row|grid-area" packages/openlayers-gis-demo/src
rg -n '"(\^|~)|latest' packages/openlayers-gis-demo/package.json
```

预期：前三个命令和 `git diff --check` 退出码为 0；两个 `rg` 无匹配。禁止运行测试命令和 Webpack 命令。

- [ ] **Step 3: 完整文件诊断与协议审查**

检查全部触碰文件，不只检查修改行；核对实现逻辑、公开联合类型、失败原因、经纬度顺序、距离/面积/半径单位、时间格式、2,000 条上限、风险权重、墓碑与生命周期注释。

- [ ] **Step 4: 提供用户手动验收清单**

1. 六种分析工具可以进入、取消、重试和切换；
2. 已知点位的测距、面积和缓冲区展示单位正确；
3. 最近事件按距离排序，数量限制为 1～100；
4. Polygon/Circle 区域统计与当前量级事件一致；
5. 区域对比展示 A 独有、共同和 B 独有；
6. 超过 2,000 条命中时地图不加载完整高亮；
7. 保存结果刷新后恢复，不同数据量级互相隔离；
8. 数据变化后旧记录显示过期并要求重新执行；
9. GeoJSON 导入导出统计正确；
10. Memory 降级、持久化失败和初始化失败提示正确；
11. 快速切换分析或页面卸载后没有旧结果回写和残留交互。

- [ ] **Step 5: 记录实际结果**

在本计划末尾记录 typecheck、Lint、Vite、静态扫描和用户手动验收结果；明确列出未验证项，不得用构建通过替代页面验收。

- [ ] **Step 6: 提交 Task 7**

```bash
git add packages/openlayers-gis-demo/README.md docs/superpowers/plans/2026-10-14-gis-spatial-analysis-workbench.md
git commit -m "docs: document gis spatial analysis"
```

---

## Final Review Checklist

- [ ] 未创建或修改任何测试代码。
- [ ] 六类分析均使用可序列化 WGS84 输入和稳定结果协议。
- [ ] 距离、面积、半径和坐标顺序具有明确单位与边界。
- [ ] 跨 180° 经线 Polygon 被明确拒绝。
- [ ] 最近事件和区域统计使用完整数据索引，不依赖当前视口数组。
- [ ] 风险评分使用固定权重且标明仅用于演示排序。
- [ ] 分析图层不改写事件 Feature 样式。
- [ ] 高亮最多写入 2,000 个事件 Feature。
- [ ] 分析记录按数据量级隔离，并保护过期数据版本。
- [ ] 写入失败时页面、Controller、Pinia 和地图不提前提交。
- [ ] 完整事件数据不进入 Pinia 或 OpenLayers Source。
- [ ] 公共入口不泄漏 Repository Key、namespace、shard 或 IndexedDB 类型。
- [ ] 全部触碰文件完成完整诊断和中文语义审查。
- [ ] 页面验证由用户手动完成，Agent 未操作浏览器。
- [ ] 未执行任何 Webpack 命令。
- [ ] 本批自有前端样式未使用 CSS Grid。
