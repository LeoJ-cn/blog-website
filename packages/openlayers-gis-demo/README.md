# 城市巡检 GIS 综合管理平台

`@blog/openlayers-gis-demo` 是面向城市巡检业务的 OpenLayers 综合管理项目。它不是 API 示例集合，而是一个具备地图架构、海量点位、空间交互、业务状态联动和轨迹回放能力的独立 Feature Package。

应用入口：`/playground/engineering/openlayers-gis`

## 技术栈

- Vue 3.5.13
- TypeScript 5.6.3
- Pinia 3.0.1
- OpenLayers 10.10.0
- Vite 6.0.11
- pnpm Workspace

## 功能概览

- 城市巡检事件列表、地图点位、Popup 和详情面板双向联动。
- 按事件 ID/地址、处置状态、事件类型和调度等级筛选，地图、Cluster 与列表同步更新。
- 待处理、处理中和已完成事件数量统计。
- 事件按“待处理 → 处理中 → 已完成”单向流转，并同步地图颜色、列表、筛选结果与统计。
- 支持地图选点新建、编辑和二次确认删除事件；业务字段、WGS84 坐标、筛选结果、地图点位与空间区域统计同步更新。
- 事件详情展示上报、资料编辑、开始处理和完成处置的增量时间线。
- 1k、10k、50k、100k 稳定 Mock 数据切换。
- 普通 `VectorLayer` 与 `Cluster` 聚合模式切换。
- 点位填充色表达处置状态（待处理红、处理中橙、已完成绿），SelectionLayer 使用独立青色光圈；事件等级保留为文字信息。
- 底图、事件、轨迹、绘制区域和选中高亮图层可独立控制显隐。
- 数据量、渲染模式、Zoom 和当前 Feature 数量展示。
- `Select`、Point/Polygon/Circle `Draw` 和 `Modify`。
- Polygon/Circle 区域内事件筛选及修改后重新计算。
- Polygon/Circle 区域保存、预设区域载入、定位、修改、删除及事件数量同步。
- 支持将区域内待处理或处理中事件按状态机批量推进，并同步筛选、地图颜色与处置记录。
- 完整巡检轨迹、人员当前位置和时间插值动画。
- 播放、暂停、重置、1x/2x/8x 速度控制和当前巡检时间展示。

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
├── Pinia：事件、选中 ID、区域筛选结果
└── MapManager
    ├── OpenLayers Map / View / Overlay
    ├── LayerManager
    ├── SpatialInteractionManager
    └── TrackPlaybackController
```

`MapManager` 是 Vue 与 OpenLayers 之间的命令式边界。Vue 组件只传入 DOM、业务数据和回调，不负责创建或销毁 Map、Layer、Source、Feature、Geometry、Interaction。

### 为什么需要 MapManager

OpenLayers 是有状态的命令式对象系统，Vue 是声明式响应式系统。若组件直接创建所有地图对象，会出现以下问题：

- 生命周期散落，页面重复挂载后容易残留监听器和 Interaction。
- 业务组件需要了解过多 OpenLayers 类型和调用顺序。
- Layer 显隐、数据更新、动画和 Popup 难以形成一致协议。
- Map 实例可能因响应式更新被重复创建。

`MapManager` 统一处理初始化、挂载、业务命令和销毁，使组件只依赖稳定的业务 API。

## Layer 架构

| Layer ID     | 实现                         | 职责                         |
| ------------ | ---------------------------- | ---------------------------- |
| `base`       | `TileLayer<OSM>`             | 在线基础底图                 |
| `event`      | `VectorLayer`                | 普通事件点位和精确选择       |
| `cluster`    | `VectorLayer<ClusterSource>` | 海量点位聚合展示             |
| `region`     | `VectorLayer`                | Draw/Modify 空间范围         |
| `track`      | `VectorLayer`                | 完整轨迹和人员当前位置       |
| `selection`  | `VectorLayer`                | 当前选中事件的独立高亮       |
| `eventDraft` | `VectorLayer`                | 新建或编辑事件的临时选点标记 |

`LayerManager` 维护 Layer ID 到实例的唯一映射，统一提供 `addLayer`、`removeLayer`、`getLayer`、`showLayer`、`hideLayer` 和 `destroy`。普通点位与 Cluster 共享同一个事件 `VectorSource`，避免切换模式时重复维护十万条 Feature。SelectionLayer 复用一个只保存坐标的 Feature，不修改原始事件 Feature，并在普通点与 Cluster 模式之间保留一致的选中效果。点位颜色只表达处置状态，避免与事件等级产生重复语义。

## 海量点优化方案

### 1. Cluster 降低同屏绘制压力

Cluster 按当前分辨率合并邻近点位，低 Zoom 下只绘制聚合结果。它不会减少原始业务数据，而是减少同一帧需要绘制和参与命中的图形数量。

### 2. Style 缓存

事件样式按等级缓存，Cluster 样式按聚合数量缓存。渲染回调不会为每个 Feature、每一帧重复创建 `Style`、`Fill`、`Stroke` 和 `Text`。Cluster 缓存设有容量上限，避免长时间缩放后持续增长。

### 3. 批量更新 Source

数据切换时先完成 Feature 转换，再使用一次 `clear` 和一次 `addFeatures` 批量替换，避免逐条写入造成重复渲染。

### 4. 控制 Vue DOM 数量

地图保留完整的 1k–100k Feature，但列表最多渲染 100 行。每个地图点都由 Canvas 渲染，不创建 Vue DOM Marker，因此测试结果主要体现 OpenLayers 渲染压力。

### 5. 避免深层响应式代理

Pinia 中的事件集合使用 `shallowRef` 并整体替换，不为十万个只读 Mock 对象创建深层 Vue Proxy。

### 10 万点为什么需要优化

十万条业务对象、Feature、Geometry、空间索引和命中检测都会占用内存与主线程时间。如果逐点创建 DOM、每帧创建 Style，或在响应式系统中深层代理所有字段，拖拽和缩放会产生明显卡顿与 GC 抖动。当前方案优先采用 Cluster、Style Cache、批量更新和有限 DOM，不在第一阶段引入 Web Worker 或额外 GIS 库。

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

组件 `onMounted` 只创建一次 `MapManager`，`onBeforeUnmount` 调用幂等 `destroy`。销毁流程包括：

- 解除 Map target。
- 解绑 OpenLayers 事件监听器。
- 移除 Select、Draw 和 Modify。
- 取消 `requestAnimationFrame`。
- 移除 Overlay 和 Layer。
- 清空事件 Source。
- 解除 ClusterSource 对事件 Source 的引用。

## 本地运行与验证

```bash
pnpm dev:vite
```

访问：

```text
http://127.0.0.1:4173/#/playground/engineering/openlayers-gis
```

静态检查：

```bash
pnpm --filter @blog/openlayers-gis-demo typecheck
pnpm typecheck
pnpm lint
pnpm build:vite
```

仓库约束要求页面交互和性能体验由用户手动验证，不默认执行 Webpack 构建。

性能测试区会记录最近一次批量更新的业务数据生成、OpenLayers Feature 转换、VectorSource 更新和地图 `rendercomplete` 延迟，单位均为毫秒。该面板只展示实际测量值，不用主线程单次耗时推算 FPS。

## 面试问题与回答

### OpenLayers 10 万点怎么优化？

先判断瓶颈是数据创建、响应式代理还是绘制。当前项目使用 Cluster 降低同屏 Feature 数量，缓存 Style，批量更新 VectorSource，限制 Vue 列表 DOM，并用 `shallowRef` 避免十万对象深层代理。若真实生产数据仍超过主线程预算，再基于测量结果考虑视口加载、服务端聚合、矢量瓦片、WebGL Layer 或 Worker，而不是第一步就增加复杂度。

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
