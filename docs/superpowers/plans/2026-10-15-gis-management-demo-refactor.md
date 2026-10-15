# GIS Management Demo Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `GisManagementDemo.vue` 按业务域拆成子组件与 composables，同时保持现有 UI、交互、地图行为、IndexedDB 数据和 Package 公共 API 不变。

**Architecture:** 采用按业务域纵向拆分的方式，让每个领域同时拥有 UI 子组件和状态逻辑；`GisManagementDemo.vue` 只负责页面级实例生命周期、DOM 挂载点和跨域协调。现有 `MapManager`、Pinia Store、持久化层和服务层继续作为底层能力，不做重写或反向依赖组件层。

**Tech Stack:** Vue 3 Composition API、TypeScript、Pinia、OpenLayers、IndexedDB、Vite、pnpm Workspace。

**Spec:** `docs/superpowers/specs/2026-10-15-gis-management-demo-refactor-design.md`

## Global Constraints

- 第一阶段严格保持现有 UI、交互、文案、响应式布局和数据行为不变。
- 不改变 `tiandituToken` prop、Package 公共入口、IndexedDB schema、数据库命名或对象仓库。
- 不新增依赖，不新增全局 Store，不使用 provide/inject 隐藏依赖。
- 自有前端源码禁止 CSS Grid；触碰的布局继续使用 Flexbox、媒体查询或合理定位。
- 不执行任何 Webpack 命令。
- 当前任务未获得测试代码授权，不创建或修改测试文件、测试用例、测试夹具或测试辅助代码。
- 因测试代码未授权，本计划不执行 TDD；每批使用现有 TypeScript、ESLint、Vite 构建和经授权的页面回归验证。
- 页面自动验收必须在对应执行阶段收到准确口令 `允许自动启动页面测试` 后进行。
- 每批只迁移一个明确领域，保持可构建、可独立审查并单独提交。
- 新组件原则上不超过约 500 行，新 composable 原则上不超过约 400 行；超出时重新检查职责边界。
- 复杂逻辑、关键业务规则、坐标/时间/容量语义和非直观公开类型必须保留或补充准确的简体中文注释。

## Review Focus

- 数据量级切换发生在异步初始化或视口查询期间时：旧请求不得覆盖新数据库状态；由 Task 1 的页面验收固定。
- 场景切换离开空间分析时：仅取消未提交分析，已完成或已保存结果保持现有语义；由 Task 3 的页面验收固定。
- 事件筛选导致当前选中事件离开结果集时：地图高亮、Popup 和详情面板必须同步清理；由 Task 4/5 的页面验收固定。
- 事件附件组件卸载或切换数据集时：Object URL 必须按现有生命周期释放且不丢失已恢复元数据；由 Task 5 的页面验收固定。
- 地图容器和 Popup DOM 引用跨组件迁移时：`MapManager` 只能初始化一次且销毁完整；由 Task 6 的页面验收固定。

---

### Task 1: 提取 Workspace 外壳和展示区域

**Files:**
- Create: `packages/openlayers-gis-demo/src/components/workspace/GisWorkspaceHeader.vue`
- Create: `packages/openlayers-gis-demo/src/components/workspace/OperationsSummary.vue`
- Create: `packages/openlayers-gis-demo/src/components/workspace/GisWorkspaceStatus.vue`
- Create: `packages/openlayers-gis-demo/src/components/workspace/workspace-types.ts`
- Create: `packages/openlayers-gis-demo/src/composables/useGisWorkspace.ts`
- Modify: `packages/openlayers-gis-demo/src/components/GisManagementDemo.vue`

**Interfaces:**
- Produces: `WorkspaceScene = 'realtime' | 'dispatch' | 'replay' | 'analysis'`。
- Produces: `WorkspaceSceneMeta { label: string; description: string }` 与 `WORKSPACE_SCENE_META`。
- Produces: `useGisWorkspace(options)`，返回 `workspaceScene`、`activeSceneMeta`、`activeDatasetScale`、`pendingDatasetScale`、`initializationState`、`initializationError`、`persistenceFeedback`、`changeWorkspaceScene()`、`changeDatasetScale()`、`retryWorkspaceInitialization()`。
- Consumes: 父组件传入的 `initialize(scale)`、`disposeRuntime()`、`applyScene(scene)` 和 `clearPendingAnalysis()` 回调；composable 不直接创建地图或数据库实例。

- [ ] **Step 1: 建立 Workspace 内部协议**

  将 `WorkspaceScene`、场景元数据类型和常量移到 `workspace-types.ts`；保持四个场景的 value、标签和描述完全不变。

- [ ] **Step 2: 提取 `useGisWorkspace(options)`**

  迁移初始化状态、数据量级状态、场景状态和对应切换动作；明确 `changeDatasetScale(): Promise<void>` 与 `changeWorkspaceScene(scene: WorkspaceScene): void`，通过回调编排跨域行为。

- [ ] **Step 3: 提取三个展示组件**

  `GisWorkspaceHeader.vue` 通过 props 展示数据量级、场景和存储状态，通过 `change-scale`、`change-scene` 事件通知父层；`OperationsSummary.vue` 只展示统计并发出快捷筛选事件；`GisWorkspaceStatus.vue` 只展示当前性能与交互状态。

- [ ] **Step 4: 在父组件完成装配**

  替换原模板区块，保留原关键 class、aria 属性、按钮顺序和媒体查询选择器；父组件继续持有共享实例创建与销毁逻辑。

- [ ] **Step 5: 运行非页面检查**

  Run: `pnpm --filter @blog/openlayers-gis-demo typecheck`

  Expected: exit 0。

  Run: `pnpm exec eslint packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/components/workspace packages/openlayers-gis-demo/src/composables/useGisWorkspace.ts`

  Expected: exit 0。

- [ ] **Step 6: 经授权后执行页面验收**

  验证 1k/10k/50k/100k 切换、刷新后保留最后选择、四个场景切换、初始化失败重试入口和关键响应式布局；预期行为与重构前一致。

- [ ] **Step 7: 提交本批**

  ```bash
  git add packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/components/workspace packages/openlayers-gis-demo/src/composables/useGisWorkspace.ts
  git commit -m "refactor(gis): extract workspace shell"
  ```

### Task 2: 提取轨迹回放领域

**Files:**
- Create: `packages/openlayers-gis-demo/src/components/replay/TrackPlaybackControls.vue`
- Create: `packages/openlayers-gis-demo/src/composables/useTrackPlayback.ts`
- Modify: `packages/openlayers-gis-demo/src/components/GisManagementDemo.vue`

**Interfaces:**
- Produces: `useTrackPlayback(options)`，返回 `trackSpeed`、`trackStatus`、`trackTime`、`trackProgressPercent`、`trackActiveGridSequence`、`trackActiveGridLabel`、`trackCoveredGridCount`、距离与时间展示值，以及 `play()`、`pause()`、`reset()`、`changeSpeed(speed)`、`seek(progress)`、`seekCheckpoint(sequence)`。
- Consumes: `MapManager` 的轨迹控制窄接口和 `mockInspectionTrack`；坐标顺序继续为 `[经度, 纬度]`，时间单位继续为毫秒。

- [ ] **Step 1: 提取轨迹计算和状态**

  将轨迹时长、距离、进度、覆盖网格和格式化逻辑迁入 `useTrackPlayback.ts`，保留现有空轨迹、首尾时间点和进度边界处理。

- [ ] **Step 2: 提取轨迹控制组件**

  组件接收展示状态，通过 `play`、`pause`、`reset`、`change-speed`、`seek`、`seek-checkpoint` 事件通知父层；保留原 class、aria 和节点按钮顺序。

- [ ] **Step 3: 在父组件连接地图控制接口**

  父组件将 `MapManager` 的播放、暂停、重置、速度和定位操作显式传入 composable，移除原轨迹领域状态与函数。

- [ ] **Step 4: 运行非页面检查**

  Run: `pnpm --filter @blog/openlayers-gis-demo typecheck`

  Run: `pnpm exec eslint packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/components/replay packages/openlayers-gis-demo/src/composables/useTrackPlayback.ts`

  Expected: 两条命令均 exit 0。

- [ ] **Step 5: 经授权后执行页面验收**

  验证播放、暂停、重置、1x/2x/8x、进度拖动、12 个网格节点跳转，以及切换场景后轨迹状态语义不变。

- [ ] **Step 6: 提交本批**

  ```bash
  git add packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/components/replay packages/openlayers-gis-demo/src/composables/useTrackPlayback.ts
  git commit -m "refactor(gis): extract track playback"
  ```

### Task 3: 提取空间分析领域

**Files:**
- Create: `packages/openlayers-gis-demo/src/components/analysis/SpatialAnalysisWorkbench.vue`
- Create: `packages/openlayers-gis-demo/src/composables/useSpatialAnalysisWorkspace.ts`
- Modify: `packages/openlayers-gis-demo/src/components/GisManagementDemo.vue`

**Interfaces:**
- Produces: `useSpatialAnalysisWorkspace(options)`，返回分析参数、`analysisState`、`savedAnalyses`、当前结果数据版本，以及 `selectTool()`、`handleGeometryDrawn()`、`execute()`、`save()`、`openSaved()`、`rerunLoaded()`、`removeSaved()`、`exportSaved()`、`importSaved()`、`resetPending()`。
- Consumes: `Pick<GisApi, 'executeSpatialAnalysis' | 'saveSpatialAnalysis' | 'listSpatialAnalyses' | 'loadSpatialAnalysis' | 'removeSpatialAnalysis'>`、地图分析图层窄接口、当前 `datasetVersion` 和 `demoClock`。
- Preserves: 分析几何与 Controller 状态使用 `shallowRef`，不得重新引入 Vue 深层代理导致的 `structuredClone`/IndexedDB 克隆错误。

- [ ] **Step 1: 提取分析状态机编排**

  迁移六种输入构造、两阶段区域对比、执行竞态保护、结果版本和地图高亮同步；保留 `SpatialAnalysisController` 作为状态机，不复制其实现。

- [ ] **Step 2: 提取分析持久化操作**

  迁移保存、加载、重跑、删除及 GeoJSON 导入导出；保持当前数据库隔离、旧数据版本提示和导入覆盖语义。

- [ ] **Step 3: 提取分析工作台组件**

  组件仅渲染工具、参数、状态、结果和记录，通过语义化事件调用 composable；保持六种工具顺序、输入范围、反馈文案和原 CSS class。

- [ ] **Step 4: 在父组件连接地图与场景生命周期**

  父组件向 composable 提供地图分析接口；离开分析场景时只调用 `resetPending()`，不得清除已成功或已保存结果。

- [ ] **Step 5: 运行非页面检查**

  Run: `pnpm --filter @blog/openlayers-gis-demo typecheck`

  Run: `pnpm exec eslint packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/components/analysis packages/openlayers-gis-demo/src/composables/useSpatialAnalysisWorkspace.ts`

  Expected: 两条命令均 exit 0。

- [ ] **Step 6: 经授权后执行页面验收**

  验证测距、测面积、缓冲区、最近事件、区域统计、区域对比；验证保存、刷新恢复、重跑、导入导出、删除确认和数据量级隔离；控制台不得出现 error/warning。

- [ ] **Step 7: 提交本批**

  ```bash
  git add packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/components/analysis packages/openlayers-gis-demo/src/composables/useSpatialAnalysisWorkspace.ts
  git commit -m "refactor(gis): extract spatial analysis workspace"
  ```

### Task 4: 提取任务列表领域

**Files:**
- Create: `packages/openlayers-gis-demo/src/components/events/EventTaskList.vue`
- Create: `packages/openlayers-gis-demo/src/components/events/event-task-types.ts`
- Create: `packages/openlayers-gis-demo/src/composables/useEventTaskList.ts`
- Modify: `packages/openlayers-gis-demo/src/components/GisManagementDemo.vue`

**Interfaces:**
- Produces: `EventListSort = 'CREATED_DESC' | 'CREATED_ASC' | 'LEVEL_DESC' | 'STATUS_ASC'` 与对应选项。
- Produces: `useEventTaskList(options)`，返回筛选草稿、SLA 视图、人员筛选、排序、分页、范围、统计和 `applyFilters()`、`resetFilters()`、`applyStatusQuickFilter()`、`applyTypeFilter()`、`applyLevelFilter()`、`changePage()`、`jumpToPage()`、`changeSort()`。
- Consumes: `Ref<readonly InspectionEvent[]>`、区域事件 ID、当前选择 ID和每页固定容量 `100`。

- [ ] **Step 1: 提取列表类型、常量和纯计算**

  迁移排序枚举、优先级、分页容量、SLA 计算、筛选、排序、分页和统计；保留页码钳制和筛选后回到第一页的行为。

- [ ] **Step 2: 提取任务列表组件**

  迁移筛选表单、结果工具、状态统计、分页和事件项；组件发出 `select-event`、`fit-results`、`export-results`、`import-events` 等事件。

- [ ] **Step 3: 在父组件协调地图选择和视口结果**

  当筛选结果不再包含当前事件时，父组件同步清理 Store 选择、地图高亮和 Popup；保持当前视口查询与列表滚动行为。

- [ ] **Step 4: 运行非页面检查**

  Run: `pnpm --filter @blog/openlayers-gis-demo typecheck`

  Run: `pnpm exec eslint packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/components/events/EventTaskList.vue packages/openlayers-gis-demo/src/components/events/event-task-types.ts packages/openlayers-gis-demo/src/composables/useEventTaskList.ts`

  Expected: 两条命令均 exit 0。

- [ ] **Step 5: 经授权后执行页面验收**

  验证关键字、状态、类型、等级、SLA、人员筛选、四种排序、分页跳转、地图定位、导入覆盖和导出；验证筛选移除当前选中事件时所有选择表现同步清除。

- [ ] **Step 6: 提交本批**

  ```bash
  git add packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/components/events/EventTaskList.vue packages/openlayers-gis-demo/src/components/events/event-task-types.ts packages/openlayers-gis-demo/src/composables/useEventTaskList.ts
  git commit -m "refactor(gis): extract event task list"
  ```

### Task 5: 提取事件管理领域

**Files:**
- Create: `packages/openlayers-gis-demo/src/components/events/EventDetailPanel.vue`
- Create: `packages/openlayers-gis-demo/src/components/events/EventEditor.vue`
- Create: `packages/openlayers-gis-demo/src/components/events/event-management-types.ts`
- Create: `packages/openlayers-gis-demo/src/composables/useEventManagement.ts`
- Modify: `packages/openlayers-gis-demo/src/components/GisManagementDemo.vue`

**Interfaces:**
- Produces: `EventFormDraft`、`EventEvidenceAttachment` 内部协议，保留坐标顺序 `[经度, 纬度]` 和附件容量/文件大小单位语义。
- Produces: `useEventManagement(options)`，返回表单、删除候选、分派人、附件状态、SLA/时间线展示，以及新建、编辑、保存、取消、地图选点、删除、分派、推进状态、添加/移除附件、释放 Object URL 等操作。
- Consumes: 当前 `GisApi` 事件写操作、Store 事件操作、地图选点/更新/删除窄接口和任务列表的同步回调。

- [ ] **Step 1: 提取事件表单和附件协议**

  迁移 `EventFormDraft`、默认值和附件元数据类型，为坐标顺序、文件字节数和 Object URL 生命周期补充必要中文注释。

- [ ] **Step 2: 提取事件管理 composable**

  迁移表单校验、新增、编辑、删除确认状态、分派、状态推进、附件恢复和释放；保持“导入覆盖”和当前数据库写入边界不变。

- [ ] **Step 3: 提取编辑器与详情面板**

  `EventEditor.vue` 只承担表单和地图选点入口；`EventDetailPanel.vue` 负责详情、调度、附件、操作按钮和时间线，所有写操作通过事件通知上层。

- [ ] **Step 4: 在父组件协调 Store、地图和列表**

  保存、删除或分派后同步当前列表、地图 Source、选中态和 Popup；切换数据量级或组件卸载时释放全部 Object URL。

- [ ] **Step 5: 运行非页面检查**

  Run: `pnpm --filter @blog/openlayers-gis-demo typecheck`

  Run: `pnpm exec eslint packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/components/events packages/openlayers-gis-demo/src/composables/useEventManagement.ts`

  Expected: 两条命令均 exit 0。

- [ ] **Step 6: 经授权后执行页面验收**

  验证新建、编辑、地图选点、取消、删除确认、分派、状态推进、附件上传/移除/恢复，以及筛选开启时事件离开当前结果的同步行为。

- [ ] **Step 7: 提交本批**

  ```bash
  git add packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/components/events packages/openlayers-gis-demo/src/composables/useEventManagement.ts
  git commit -m "refactor(gis): extract event management"
  ```

### Task 6: 提取地图面板和区域管理

**Files:**
- Create: `packages/openlayers-gis-demo/src/components/map/GisMapPanel.vue`
- Create: `packages/openlayers-gis-demo/src/components/map/LayerControlPanel.vue`
- Create: `packages/openlayers-gis-demo/src/components/map/RegionManager.vue`
- Create: `packages/openlayers-gis-demo/src/components/map/map-panel-types.ts`
- Create: `packages/openlayers-gis-demo/src/composables/useRegionManagement.ts`
- Modify: `packages/openlayers-gis-demo/src/components/GisManagementDemo.vue`

**Interfaces:**
- Produces: `LayerControlId`、图层配置和 `useRegionManagement(options)`；后者返回区域保存能力、区域状态统计和 `saveCurrent()`、`openRegion(id)`、`removeRegion(id)`、`batchAdvance(fromStatus)`。
- Produces: `GisMapPanel.vue` 通过显式模板引用向父组件提供地图 target 与 Popup element；不创建 `MapManager`。
- Consumes: Store 区域状态、`GisApi` 区域持久化接口、`MapManager` 区域/图层/交互/渲染窄接口。

- [ ] **Step 1: 提取区域状态和操作**

  迁移区域统计、保存、打开、删除和批量推进；保留区域不存在、空选区和已完成事件不重复推进的现有语义。

- [ ] **Step 2: 提取图层控制与区域组件**

  组件通过 props/emits 展示并操作图层、交互模式、渲染模式和区域列表；保留原控件顺序、aria 与 class。

- [ ] **Step 3: 提取地图面板结构**

  迁移地图 canvas、分析工作台插槽、缩放/场景指示、图例、图层面板和 Popup 挂载点；使用 `defineExpose` 暴露 `getMapTarget(): HTMLElement | null` 与 `getPopupElement(): HTMLElement | null`，不得在子组件内创建地图实例。

- [ ] **Step 4: 收敛父组件生命周期**

  父组件在子组件挂载完成后只创建一个 `MapManager`；数据量级切换按现有顺序销毁旧运行时并创建新运行时；卸载时完整释放监听、交互、Overlay、Object URL 和查询控制器。

- [ ] **Step 5: 运行非页面检查**

  Run: `pnpm --filter @blog/openlayers-gis-demo typecheck`

  Run: `pnpm exec eslint packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/components/map packages/openlayers-gis-demo/src/composables/useRegionManagement.ts`

  Expected: 两条命令均 exit 0。

- [ ] **Step 6: 经授权后执行页面验收**

  验证地图首次初始化、数据量级切换、点位选择、Popup、Point/Polygon/Circle/Modify、图层控制、Cluster/普通点位、区域保存/打开/删除/批量推进和重复切换后的资源释放。

- [ ] **Step 7: 提交本批**

  ```bash
  git add packages/openlayers-gis-demo/src/components/GisManagementDemo.vue packages/openlayers-gis-demo/src/components/map packages/openlayers-gis-demo/src/composables/useRegionManagement.ts
  git commit -m "refactor(gis): extract map and region workspace"
  ```

### Task 7: 收敛父组件并执行全量验收

**Files:**
- Modify: `packages/openlayers-gis-demo/src/components/GisManagementDemo.vue`
- Modify: 前六批创建的文件，仅用于修复本批审查发现的职责泄漏、类型不一致或样式归属问题。

**Interfaces:**
- Consumes: Tasks 1–6 的全部稳定接口。
- Produces: 保持原 Package 公共入口不变的精简 `GisManagementDemo.vue`；目标约 600–900 行，只承担装配、共享生命周期和跨域协调。

- [ ] **Step 1: 清理父组件残留领域逻辑**

  删除已经迁出的重复常量、computed、watch 和操作函数；逐项确认父组件剩余代码只属于装配、共享实例生命周期或跨域协调。

- [ ] **Step 2: 整理样式归属**

  将领域私有样式放入对应组件，跨组件布局样式保留在父组件；保持选择器优先级、响应式断点和 DOM 关键 class 不变，不引入 CSS Grid。

- [ ] **Step 3: 审查协议和注释**

  检查全部新增公开类型、联合状态、错误反馈、坐标、时间、比例、容量和 offset 语义；补充缺失的简体中文注释并删除已经失效的注释。

- [ ] **Step 4: 运行完整非页面门禁**

  Run: `pnpm --filter @blog/openlayers-gis-demo typecheck`

  Expected: exit 0。

  Run: `pnpm exec eslint packages/openlayers-gis-demo/src/components packages/openlayers-gis-demo/src/composables`

  Expected: exit 0。

  Run: `pnpm build:vite`

  Expected: exit 0；可以报告既有非阻断警告，但不得执行 Webpack。

  Run: `git diff --check`

  Expected: exit 0。

- [ ] **Step 5: 经授权后执行完整页面回归**

  覆盖四个数据量级、四个场景、任务列表、事件全流程、地图交互、区域管理、轨迹回放、六种空间分析、保存与刷新恢复、数据库隔离和控制台错误；预期与重构前一致。

- [ ] **Step 6: 检查规模和依赖方向**

  确认父组件达到约 600–900 行目标，新增组件/composable 未形成新的超大职责单元，且不存在底层模块反向依赖组件层或跨领域循环依赖。

- [ ] **Step 7: 提交收尾**

  ```bash
  git add packages/openlayers-gis-demo/src/components packages/openlayers-gis-demo/src/composables
  git commit -m "refactor(gis): finalize management workspace decomposition"
  ```
