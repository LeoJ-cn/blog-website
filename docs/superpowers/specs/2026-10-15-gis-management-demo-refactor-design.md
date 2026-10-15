# GIS 管理工作台组件化重构设计

## 1. 背景

`packages/openlayers-gis-demo/src/components/GisManagementDemo.vue` 当前约 4,600 行，同时承担页面布局、事件列表、事件处置、地图控制、区域管理、轨迹回放、空间分析、数据量级切换、持久化和生命周期协调等职责。

继续在单文件中扩展功能会提高修改冲突、回归和认知成本。本次重构通过“子组件 + composables”同步拆分职责，但不改变现有产品行为。

## 2. 目标与非目标

### 2.1 目标

- 将页面按业务域拆成职责清晰的子组件和 composable。
- 让业务状态靠近所属领域，避免形成新的“上帝 composable”。
- 保留 `GisManagementDemo.vue` 作为页面装配、共享实例生命周期和跨域协调入口。
- 保持现有 UI、交互、响应式布局、地图行为、IndexedDB 数据和 Package 公共 API 不变。
- 为后续 GIS 功能扩展提供稳定边界。

### 2.2 非目标

- 不新增 GIS 功能。
- 不调整视觉设计、交互流程或文案。
- 不改变 IndexedDB 数据库名称、对象仓库、数据结构或迁移规则。
- 不重写 `MapManager`、Pinia Store、持久化层或空间分析引擎。
- 不引入新的全局 Store、依赖或 CSS Grid。
- 未获得当前任务测试代码授权，因此不新增或修改测试文件。

## 3. 架构选择

采用“按业务域纵向拆分 + 底层地图能力保持独立”的结构。每个功能域同时拥有 UI 子组件和 composable，模板、状态和操作一起迁移。

不采用以下方案：

- 单一大型 `useGisWorkspace`：会把组件问题转移成 composable 问题。
- 只拆模板：会产生大量 props/emits，父组件仍然承担全部业务逻辑。
- 重写式迁移：难以证明行为保持不变，回归范围过大。

目标目录如下：

```text
packages/openlayers-gis-demo/src/
├── components/
│   ├── GisManagementDemo.vue
│   ├── workspace/
│   │   ├── GisWorkspaceHeader.vue
│   │   ├── OperationsSummary.vue
│   │   └── GisWorkspaceStatus.vue
│   ├── events/
│   │   ├── EventTaskList.vue
│   │   ├── EventDetailPanel.vue
│   │   └── EventEditor.vue
│   ├── map/
│   │   ├── GisMapPanel.vue
│   │   ├── LayerControlPanel.vue
│   │   └── RegionManager.vue
│   ├── analysis/
│   │   └── SpatialAnalysisWorkbench.vue
│   └── replay/
│       └── TrackPlaybackControls.vue
└── composables/
    ├── useGisWorkspace.ts
    ├── useEventTaskList.ts
    ├── useEventManagement.ts
    ├── useSpatialAnalysisWorkspace.ts
    ├── useRegionManagement.ts
    └── useTrackPlayback.ts
```

实际实施时允许根据既有代码依赖合并过小模块，但不得用合并结果重新形成大型通用 composable。

## 4. 职责边界

### 4.1 `GisManagementDemo.vue`

保留以下职责：

- 接收并传递 `tiandituToken`。
- 创建和销毁 `LocalGisApi`、`MapManager`、`ViewportQueryController` 等页面级共享实例。
- 持有地图容器、Popup 容器等跨模块 DOM 引用。
- 编排数据量级切换、场景切换和初始化恢复。
- 协调事件、区域、轨迹和空间分析之间的少量跨域动作。

父组件不得继续实现领域内部的筛选、分页、表单校验、分析输入构造或轨迹计算。

### 4.2 Workspace 域

- `GisWorkspaceHeader.vue`：标题、数据量级选择、场景导航和存储状态。
- `OperationsSummary.vue`：今日新增、处置状态、超时、在线人员和闭环率展示与快捷筛选事件。
- `GisWorkspaceStatus.vue`：底部数据量、渲染和性能状态。
- `useGisWorkspace.ts`：初始化状态、数据量级、场景元数据和跨域初始化编排。

### 4.3 Events 域

- `EventTaskList.vue`：筛选控件、结果工具、排序、分页和任务列表。
- `EventDetailPanel.vue`：事件详情、调度摘要、证据和处置时间线。
- `EventEditor.vue`：新建与编辑表单、坐标选择状态和校验反馈。
- `useEventTaskList.ts`：过滤、排序、分页、统计和快捷筛选。
- `useEventManagement.ts`：新增、编辑、删除、分派、状态推进和附件生命周期。

### 4.4 Map 与 Region 域

- `GisMapPanel.vue`：地图容器、Popup 挂载点和地图浮层装配。
- `LayerControlPanel.vue`：图层显隐与渲染模式控制。
- `RegionManager.vue`：区域列表、保存、批量操作、定位和删除入口。
- `useRegionManagement.ts`：区域状态、持久化和区域内事件操作。

`MapManager` 继续位于现有 `map/` 目录，不由子组件重新创建或包装。

### 4.5 Analysis 域

- `SpatialAnalysisWorkbench.vue`：六种分析工具、参数、执行状态、结果、保存记录和导入入口。
- `useSpatialAnalysisWorkspace.ts`：分析输入构造、Controller 生命周期、执行、保存、加载、重跑、删除和导入导出。

分析几何与 Controller 状态继续使用浅层响应式容器，保证数据可以被 `structuredClone` 和 IndexedDB 克隆。

### 4.6 Replay 域

- `TrackPlaybackControls.vue`：播放、暂停、重置、速度、进度、节点跳转和状态展示。
- `useTrackPlayback.ts`：时间、进度、覆盖网格、距离计算和地图播放控制。

## 5. 数据流与通信

- 展示型子组件接收窄化的只读 props，并通过语义化事件通知上层，例如 `change-scene`、`select-event`、`execute-analysis`。
- composable 拥有对应领域的响应式状态和操作，不直接引用子组件。
- `MapManager`、`GisApi`、Store 和必要 DOM 引用由父组件创建，再作为显式依赖传入 composable。
- 不使用 provide/inject 隐藏页面内部依赖。
- 多个业务域长期共享的数据继续放在现有 Pinia Store；表单草稿、筛选条件和临时执行状态留在所属 composable。
- 子组件不得直接创建 `MapManager`、`LocalGisApi` 或新的 Pinia Store 实例。
- composable 不直接查询 DOM；需要 DOM 或地图容器时通过显式参数或回调获取。

## 6. 错误处理

- 保留现有错误文案、反馈位置和恢复动作。
- composable 将底层异常转换为当前页面已有的反馈状态。
- 子组件只展示反馈并发出重试、关闭或重新提交事件。
- 跨域初始化和数据量级切换失败由父组件协调，避免子组件直接重置其他业务域。
- 某批迁移若必须改变公开接口、持久化结构或用户行为，应暂停实施并重新评审设计。

## 7. 分批迁移顺序

### 第 1 批：纯展示区域

抽取 Header、今日态势和状态栏，建立 props/emits 命名规范，不迁移高风险业务逻辑。

### 第 2 批：轨迹回放与空间分析

抽取 `TrackPlaybackControls.vue`、`SpatialAnalysisWorkbench.vue` 及对应 composables，建立后续业务域的标准范式。

### 第 3 批：任务列表

抽取筛选、排序、分页、统计和任务列表渲染。

### 第 4 批：事件管理

抽取事件详情、表单、分派、附件和处置流程。

### 第 5 批：地图与区域管理

抽取地图浮层、图层控制和区域管理，最后收敛父组件的跨域编排接口。

每批完成后都必须保持可构建、可独立验收，不跨批堆积无法验证的中间状态。

## 8. 规模与依赖约束

- 新组件原则上控制在约 500 行以内。
- 新 composable 原则上控制在约 400 行以内。
- 超出建议规模时重新检查职责边界，不为满足数字机械拆分。
- `GisManagementDemo.vue` 最终目标约 600–900 行，只保留装配与协调职责。
- Package 公共入口和 `tiandituToken` prop 保持不变。
- 不产生从底层模块反向依赖组件层的依赖关系。
- 自有前端样式全部使用 Flexbox、媒体查询或合理定位，不新增 CSS Grid。

## 9. 验收标准

### 9.1 行为一致性

- 数据量级选择和刷新恢复行为不变。
- 1k、10k、50k、100k 对应的 IndexedDB 数据继续隔离。
- 导入数据仍覆盖当前数据集，用户新增和修改数据仍写入当前数据库。
- 事件筛选、排序、分页、新建、编辑、删除、分派、附件和状态推进保持不变。
- 地图点选、绘制、修改、图层控制、渲染模式和区域管理保持不变。
- 轨迹回放和六种空间分析工具保持不变。
- 页面关键 class、响应式断点和当前视觉结果保持不变。

### 9.2 工程门禁

- 检查每批全部触碰文件的完整 TypeScript 和 ESLint 诊断。
- 执行 Package 类型检查和 `pnpm build:vite`。
- 禁止执行 Webpack 管线。
- 每批人工检查复杂逻辑、公开协议、坐标、时间、比例和容量语义的简体中文注释。
- 当前任务不创建或修改测试代码；如后续需要，必须重新取得准确口令 `允许添加测试代码`。
- 页面自动验收必须在对应批次获得准确口令 `允许自动启动页面测试` 后执行。

## 10. 回滚策略

- 每批单独提交，提交内容不得混入下一批迁移。
- 若某批出现难以定位的行为差异，可回退该批而不影响前序已验收批次。
- 不在迁移期间同时改变 IndexedDB schema、地图引擎接口或页面视觉，以缩小问题定位范围。
