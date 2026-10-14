# 城市巡检 GIS 综合管理平台

`@blog/openlayers-gis-demo` 是面向城市巡检业务的 OpenLayers 综合管理项目。它不是 API 示例集合，而是一个具备地图架构、海量点位、空间交互、业务状态联动和轨迹回放能力的独立 Feature Package。

应用入口：`/playground/solutions/openlayers-gis`

## 技术栈

- Vue 3.5.13
- TypeScript 5.6.3
- Pinia 3.0.1
- OpenLayers 10.10.0
- Vite 6.0.11
- pnpm Workspace

## 功能概览

- 城市巡检事件列表、地图点位、Popup 和详情面板双向联动；地图选中事件会自动切换到对应列表页并展示高亮行。
- 列表支持业务排序和完整结果分页，并将每页 DOM 控制在 100 行。
- 左侧筛选区按“条件筛选、结果工具、分页导航”分层，定位、导入和导出收纳为紧凑工具栏。
- 千页级结果可直接返回首页、前往末页或输入目标页码跳转，页码始终限制在有效范围内。
- 列表行展示事件 ID、紧急程度、处置状态和本地化上报时间，排序依据可直接核对。
- 按事件 ID/地址、处置状态、事件类型和调度等级筛选，地图、Cluster 与列表同步更新。
- 待处理、处理中和已完成事件数量统计。
- 顶部运营态势支持按待处置、处理中、已超时和已完成快速联动筛选地图与任务列表。
- 未选中事件时，右侧展示当前结果的事件类型排行、紧急等级构成和 SLA 健康度；类型与等级均可点击联动筛选地图和任务列表。
- 实时态势、任务调度和巡检复盘会切换对应图层组合；任务分派和转派结果同步进入事件操作记录。
- 任务调度场景展示人员任务负载，可按具体巡检人员或未分派任务联动筛选地图和任务队列。
- 按高等级 2 小时、中等级 4 小时、低等级 8 小时计算可复现的演示 SLA，并展示剩余或超时时长。
- 事件按“待处理 → 处理中 → 已完成”单向流转，并同步地图颜色、列表、筛选结果与统计。
- 支持地图选点新建、编辑和二次确认删除事件；业务字段、WGS84 坐标、筛选结果、地图点位与空间区域统计同步更新。
- 事件详情展示上报、资料编辑、开始处理和完成处置的增量时间线。
- 事件可添加最多 3 张现场图片；metadata 与 Blob 写入当前数据量级，页面只临时创建并按生命周期释放 Blob URL。
- 单事件处置执行责任门禁：待处理事件必须先分派责任人，处理中事件必须至少添加 1 张现场图片后才能完成；禁用按钮会直接提示缺失条件。
- 标题右侧下拉框切换 1k、10k、50k、100k 稳定数据量级，保存最后选择后通过真实页面刷新载入对应数据集；Pinia 和地图只保存当前视口命中结果。
- `moveend` 触发 WGS84 BBOX 查询，支持请求取消、request ID、数据集版本校验、错误保留与重试。
- 前端 Mock Service 使用固定经纬度网格缩小候选集、有界 LRU 缓存查询，并对真实 BBOX 再做精确过滤。
- OpenLayers Event Source 使用事件 ID Diff 增删改，未变化和更新 Feature 保持对象身份。
- 普通 `VectorLayer` 与 `Cluster` 聚合模式切换。
- 点位填充色表达处置状态（待处理红、处理中橙、已完成绿），SelectionLayer 使用独立青色光圈；事件等级保留为文字信息。
- 底图、事件、轨迹、绘制区域和选中高亮图层可独立控制显隐。
- 热力分析与责任网格作为独立图层按需开启；热力图复用事件 Source，不复制海量 Feature；责任网格使用双层描边、交替填充和中心编号保证复杂底图下的辨识度。
- 数据量、渲染模式、Zoom 和当前 Feature 数量展示。
- 地图状态栏实时显示鼠标所在位置的 WGS84 经纬度，地图画布提供米制动态比例尺。
- 天地图墨卡托矢量底图与中文注记组合展示；Token 缺失或瓦片失败时保留业务图层并显示明确提示。
- 场景提示、热力强度图例和责任网格摘要随图层状态显示。
- `Select`、Point/Polygon/Circle `Draw` 和 `Modify`。
- Polygon/Circle 区域内事件筛选及修改后重新计算。
- Polygon/Circle 区域保存、预设区域载入、定位、修改、删除及事件数量同步。
- 支持将区域内待处理或处理中事件按状态机批量推进，并同步筛选、地图颜色与处置记录。
- 支持将当前筛选及区域范围内的完整事件结果导出为 WGS84 GeoJSON，而不受列表 100 行展示上限影响。
- 支持校验并 upsert 导入事件 GeoJSON；已有 ID 覆盖基础字段、新 ID 新增，未出现在文件中的事件及既有责任人、活动和附件保持不变。
- 导入反馈分别展示新增、覆盖、非法 Feature 和文件内重复 ID 数量。
- 完整巡检轨迹、人员当前位置和时间插值动画；蛇形路线依次经过 4×3 责任网格的全部 12 个中心点。
- 责任网格随回放进度区分当前、已巡和未巡状态，复盘摘要同步展示覆盖网格数与当前网格编号。
- 巡检复盘显示 1–12 号轨迹节点并标识起终点；节点沿用路线的紫色进度语义，责任网格继续独立表达空间覆盖状态。
- 未巡路线使用高对比紫色虚线，已巡路线随播放进度逐帧增长为带深色外描边的实线紫色，拖动时间轴时同步重算。
- 复盘摘要提供“实线已巡、虚线未巡”路线图例，地图网格摘要单独说明当前、已巡和未巡覆盖状态。
- 进入巡检复盘时自动适配完整轨迹范围，确保全部 12 个责任网格和蛇形路线位于当前视口。
- 播放、暂停、重置、1x/2x/8x 速度控制和当前巡检时间展示。
- 支持通过百分比时间轴拖动定位轨迹进度，播放中拖动后继续播放。
- 时间轴展示 12 个责任网格节点刻度，可点击任意节点直接跳转到对应网格，同时保留连续拖动定位。

## 布局约束

- 本 GIS Demo 禁止使用 CSS Grid，包括 `display: grid`、`grid-template-*`、`grid-column` 和 `grid-row`。
- 多栏、换行、对齐和响应式布局统一使用 Flexbox、弹性基准宽度与媒体查询实现。
- 巡检复盘场景实时计算路线总里程、已巡里程、路线完成度和已用时间；距离使用 WGS84 Haversine 公式计算。

## 项目结构

```text
packages/openlayers-gis-demo/
├── src/
│   ├── components/
│   │   └── GisManagementDemo.vue       # 页面布局和业务控制
│   ├── map/
│   │   ├── MapManager.ts               # 地图能力门面和生命周期编排
│   │   ├── LayerManager.ts             # Layer 注册、查询、显隐、移除和销毁
│   │   ├── interactions/
│   │   │   └── SpatialInteractionManager.ts
│   │   ├── layers/                     # Base/Event/Cluster/Region/Track/Selection Layer
│   │   ├── sources/                    # 业务事件到 Feature 的转换
│   │   ├── styles/                     # 事件和聚合样式缓存
│   │   └── types/                      # Feature 业务属性协议
│   ├── mock/                           # 固定 seed 事件与轨迹数据
│   ├── services/
│   │   └── TrackPlaybackController.ts  # requestAnimationFrame 时间插值
│   ├── viewport/                        # BBOX 服务、固定网格、缓存和请求治理
│   ├── stores/                         # 可序列化业务状态
│   ├── types/                          # 事件与轨迹业务类型
│   └── index.ts                        # 唯一公共入口
├── package.json
├── tsconfig.json
└── README.md
```

## GIS 架构

```text
GisManagementDemo.vue
├── LocalGisApi：持久化业务协议与索引失效编排
│   ├── GisDatasetRepository：事件 shard、详情、区域与 Blob 原子写入
│   └── MockViewportEventService：恢复快照的固定网格和 LRU
├── ViewportQueryController：Abort、request ID、版本保护和重试
├── Pinia：当前视口事件、选中 ID、区域筛选结果
└── MapManager
    ├── OpenLayers Map / View / Overlay
    ├── LayerManager
    ├── SpatialInteractionManager
    └── TrackPlaybackController
```

`MapManager` 是 Vue 与 OpenLayers 之间的命令式边界。Vue 组件只传入 DOM、业务数据和回调，不负责创建或销毁 Map、Layer、Source、Feature、Geometry、Interaction。

## 本地持久化

- 浏览器只创建一个物理数据库 `blog-gis`，由 `@blog/indexed-db` 的 `entries` object store 保存数据。
- 逻辑 namespace 为 `settings`、`dataset:1k`、`dataset:10k`、`dataset:50k`、`dataset:100k`；量级之间的用户修改互相隔离。
- 固定数据满足 `1k ⊂ 10k ⊂ 50k ⊂ 100k`，相同事件 ID 在各量级内容一致。首次进入某量级时完整生成并写入；后续刷新直接恢复，不覆盖用户修改。
- 每个数据集固定使用 128 个事件 shard。单事件写入只重写目标 shard 与 metadata；批量导入和状态推进一次原子提交所有受影响 shard。
- 新增、编辑、删除、分派、状态活动、区域、附件 metadata 和 Blob 都写入当前量级。删除使用显式 `null` 墓碑，让详情与 Blob 清理和事件删除保持同一业务提交。
- fixture 版本变化时只重建对应量级。初始化 metadata 与 128 个 shard 使用同一批写，失败后下次可以完整重试。
- IndexedDB 不可用时降级为页面内 Memory，并在标题显示“刷新后数据丢失”；配额、克隆或事务写入失败不会提前更新 Pinia、空间索引或地图。
- `GisApi` 是页面稳定业务边界，不暴露 namespace、shard 或 Key-Value Store。未来 `HttpGisApi` 可以实现同一协议，把完整数据和空间查询迁移到服务端。

### 为什么需要 MapManager

OpenLayers 是有状态的命令式对象系统，Vue 是声明式响应式系统。若组件直接创建所有地图对象，会出现以下问题：

- 生命周期散落，页面重复挂载后容易残留监听器和 Interaction。
- 业务组件需要了解过多 OpenLayers 类型和调用顺序。
- Layer 显隐、数据更新、动画和 Popup 难以形成一致协议。
- Map 实例可能因响应式更新被重复创建。

`MapManager` 统一处理初始化、挂载、业务命令和销毁，使组件只依赖稳定的业务 API。

## Layer 架构

| Layer ID     | 实现                          | 职责                         |
| ------------ | ----------------------------- | ---------------------------- |
| `base`       | `LayerGroup<TileLayer<WMTS>>` | 天地图矢量底图与中文注记     |
| `event`      | `VectorLayer`                 | 普通事件点位和精确选择       |
| `cluster`    | `VectorLayer<ClusterSource>`  | 海量点位聚合展示             |
| `region`     | `VectorLayer`                 | Draw/Modify 空间范围         |
| `track`      | `VectorLayer`                 | 完整轨迹和人员当前位置       |
| `selection`  | `VectorLayer`                 | 当前选中事件的独立高亮       |
| `eventDraft` | `VectorLayer`                 | 新建或编辑事件的临时选点标记 |

`LayerManager` 维护 Layer ID 到实例的唯一映射，统一提供 `addLayer`、`removeLayer`、`getLayer`、`showLayer`、`hideLayer` 和 `destroy`。普通点位、Cluster 与 Heatmap 共享同一个当前视口事件 `VectorSource`，避免按渲染方式复制 Feature。SelectionLayer 复用一个只保存坐标的 Feature，不修改原始事件 Feature，并在普通点与 Cluster 模式之间保留一致的选中效果。点位颜色只表达处置状态，避免与事件等级产生重复语义。

## 海量点优化方案

### 1. Cluster 降低同屏绘制压力

Cluster 按当前分辨率合并邻近点位，Zoom 小于 16 时只绘制聚合结果；达到 16 后自动展示原始点位，缩回阈值以下时恢复用户原先选择的 Cluster 模式。它不会减少原始业务数据，而是减少同一帧需要绘制和参与命中的图形数量。

### 2. Style 缓存

事件样式按处置状态缓存，Cluster 样式按聚合数量缓存。渲染回调不会为每个 Feature、每一帧重复创建 `Style`、`Fill`、`Stroke` 和 `Text`。Cluster 缓存设有容量上限，避免长时间缩放后持续增长。

### 3. 视口加载与 Feature Diff

完整 1k–100k 数据集持久化在 IndexedDB，并由 Local API 恢复到非响应式空间索引。地图 `moveend` 后将当前 extent 转为 WGS84 BBOX，查询固定网格候选并精确过滤；正常视口更新通过事件 ID Diff 增删改 Source，数据集版本切换才使用整体清空。

### 4. 控制 Vue DOM 数量

地图只保留当前视口 Feature，列表最多渲染当前结果中的 100 行。每个地图点都由 Canvas 渲染，不创建 Vue DOM Marker。

### 5. 避免深层响应式代理

Pinia 中的当前视口事件集合使用 `shallowRef` 并整体替换，完整 1k–100k 数据不会进入 Vue 响应式系统。

### 10 万点为什么需要优化

十万条业务对象和前端索引仍会占用内存与主线程时间，但它们只由 Local API 的非响应式索引持有；地图、Pinia 和列表只处理当前视口结果。当前方案同时采用持久化分片、固定网格候选、LRU、Feature Diff、Cluster、Style Cache 和有限 DOM，未引入 Web Worker、矢量瓦片、WebGL Layer 或额外 GIS 库。

## Select、Draw 和 Modify

### Select

```text
地图点击
→ OpenLayers Select
→ 获取 Feature eventId
→ MapManager 回调
→ Pinia selectedEventId
→ EventDetail 更新
```

反向联动：

```text
点击事件列表
→ eventId
→ MapManager.focusEvent
→ View.animate
→ Feature 高亮
→ Overlay Popup 定位
```

### Draw

支持 Point、Polygon 和 Circle。Point 仅表示标绘位置，不赋予面积筛选语义；Polygon 和 Circle 完成后执行区域查询。

空间筛选分两步：

1. 使用 `VectorSource.forEachFeatureInExtent` 和几何外接矩形进行空间索引粗筛。
2. 使用 `geometry.intersectsCoordinate` 判断事件点是否真正位于区域内。

### Modify

`Modify` 与 `Draw` 共享 RegionSource。修改结束后重新读取 Geometry，并执行相同的区域筛选流程。Select、Draw、Modify 任一时刻只激活一种，避免拖拽和点击事件相互竞争。

## 轨迹回放

轨迹数据由按时间升序排列的 `TrackPoint[]` 构成。每个点包含 WGS84 经纬度和 Unix 毫秒时间戳。

初始化时只创建：

- 一个完整轨迹 `LineString` Feature。
- 一个表示巡检人员位置的 Point Feature。

动画使用 `requestAnimationFrame`：

1. 根据真实经过时间和 1x/2x/8x 倍率计算目标轨迹时间。
2. 定位目标时间所在的相邻采样点。
3. 计算闭区间 `[0, 1]` 内的插值比例。
4. 更新同一个 Point Geometry 的坐标。

播放过程中不会重复创建 Feature。暂停会结算当前帧之间的剩余时间，重置会回到首个轨迹点，组件销毁时会取消动画帧。

## Vue 与 OpenLayers 如何解耦

Pinia 只保存业务状态：

- `InspectionEvent[]`
- 可序列化的事件关键词、类型、状态和等级筛选条件。
- `selectedEventId`
- 区域筛选后的 `eventId[] | null`；`null` 表示尚未筛选，空数组表示筛选结果为空。

Map、Layer、Source、Feature、Geometry、Interaction、Overlay 都由普通 TypeScript 管理器持有。

### 为什么 OpenLayers 对象不直接放 Pinia

- OpenLayers 对象包含复杂原型、内部缓存和循环引用，不适合序列化。
- Vue 深层代理可能改变对象身份和访问成本。
- Devtools、持久化和状态快照不应处理地图运行时对象。
- 业务状态的生命周期与 Map 实例生命周期不同。

地图层与业务层通过 `eventId`、字符串状态和明确回调交互，因此既保持类型安全，也避免响应式系统侵入 OpenLayers 内部。

## 生命周期与资源释放

组件 `onMounted` 先恢复 settings 和当前量级数据，再创建 Query Controller 与唯一 `MapManager`；初始化失败时不会创建半成品地图。`onBeforeUnmount` 先停止查询回调，再释放 Local API 和地图。销毁流程包括：

- 取消在途 BBOX 请求，销毁 Controller；
- 关闭 Repository、清空空间索引和 LRU；
- 解除 Map target。
- 解绑 OpenLayers 事件监听器。
- 移除 Select、Draw 和 Modify。
- 取消 `requestAnimationFrame`。
- 移除 Overlay 和 Layer。
- 清空事件 Source。
- 解除 ClusterSource 对事件 Source 的引用。

## 本地运行与验证

先复制并填写应用环境变量，真实 Token 只保存在被 Git 忽略的 `.env.local`：

```bash
cp apps/web/.env.example apps/web/.env.local
```

```dotenv
VITE_TIANDITU_TOKEN=替换为天地图浏览器端应用Token
```

GitHub Pages 部署使用仓库 Actions Secret `VITE_TIANDITU_TOKEN`。浏览器端 Token 会出现在瓦片请求中，安全边界依赖天地图控制台的域名白名单和调用配额，不能把它当作服务端秘密。

```bash
pnpm dev:vite
```

访问：

```text
http://127.0.0.1:4173/#/playground/solutions/openlayers-gis
```

静态检查：

```bash
pnpm --filter @blog/openlayers-gis-demo typecheck
pnpm typecheck
pnpm lint
pnpm build:vite
```

仓库约束要求页面交互和性能体验由用户手动验证，不默认执行 Webpack 构建。

手动验收重点：首次进入默认 10k；标题右侧下拉框切换量级后刷新并保留选择；新增、编辑、删除、分派、状态、区域和附件刷新后保持；导入覆盖与新增符合统计；不同量级修改互相隔离；DevTools 中只有 `blog-gis/entries`；Memory 与配额失败提示符合预期；首屏与快速平移仍只提交当前视口最终请求。

性能测试区会记录数据集生成、固定网格构建、BBOX 候选/命中、缓存命中、纯查询、Feature Diff 和地图 `rendercomplete` 延迟。面板展示的是当前浏览器单次运行值；仓库没有保存固定环境的对照样本，因此不能据此宣称具体提升比例。

## 面试问题与回答

### OpenLayers 10 万点怎么优化？

先判断瓶颈是数据查询、响应式代理、Source 更新还是绘制。当前项目让完整 Mock 数据只存在于 Service，通过 BBOX 固定网格查询和有界缓存缩小结果，使用 Feature ID Diff 更新 Source，再用 Cluster、Style Cache、`shallowRef` 和 100 行分页控制渲染与 DOM。真实生产环境仍应把同一 `ViewportEventService` 协议替换为 HTTP/PostGIS、服务端聚合或矢量瓦片方案。

### Cluster 解决什么问题？

Cluster 主要解决低 Zoom 下大量相邻点重复绘制、视觉遮挡和命中检测压力。它不减少原始数据，也不能解决数据生成、网络传输或业务对象占用的全部成本。

### 为什么需要 MapManager？

它把 OpenLayers 的命令式生命周期封装在 Vue 之外，集中处理 Map、View、Overlay、Layer、Interaction 和销毁。组件只调用业务方法，避免地图代码散落、重复创建 Map 和资源泄漏。

### 为什么不用 Vue DOM 渲染点位？

十万个 DOM 节点会带来布局、样式计算、内存和事件成本。OpenLayers 的 Canvas 渲染和空间索引更适合海量地理 Feature；DOM 只用于少量面板和 Popup。

### Polygon 框选为什么不用 Turf.js？

当前需求是点是否位于 Polygon/Circle 内，OpenLayers Geometry 已提供 `intersectsCoordinate`，VectorSource 也能用空间索引做 extent 粗筛。引入 Turf.js 会增加依赖和重复能力，第一阶段没有必要。

### 轨迹动画为什么要按时间插值？

直接按数组索引逐点移动会受到采样间隔和帧率影响，速度不真实。按时间戳定位线段并插值后，动画与采样频率解耦，1x/2x/8x、暂停和继续都能保持一致的时间语义。

### 为什么动画中不能不断创建 Feature？

持续创建 Feature 会增加分配、空间索引更新和垃圾回收压力。复用同一个人员 Feature，只更新 Point Geometry，成本更稳定且便于统一销毁。

### 如何避免地图资源泄漏？

明确资源所有者：LayerManager 管 Layer，SpatialInteractionManager 管 Interaction 和监听器，TrackPlaybackController 管动画帧，MapManager 负责最终编排销毁。页面卸载时只需要调用一次 `MapManager.destroy()`。

## 阶段状态

- Phase 1–2：工程检查和 Package 设计完成。
- Phase 3–4：基础地图、事件图层和业务联动完成。
- Phase 5–6：海量点、Cluster 和空间交互完成。
- Phase 7–8：轨迹回放和统一生命周期完成。
- Phase 9：性能、资源和 TypeScript 审查完成。
- Phase 10：README 与面试说明完成。
- 视口加载自动化单元测试已执行；真实页面交互、浏览器内存和性能对照仍待用户手动验证。
