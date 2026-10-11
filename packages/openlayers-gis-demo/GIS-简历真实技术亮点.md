# GIS 项目简历真实技术亮点

本文只保留当前源码能够直接证明的能力。没有实现的能力不写成项目亮点；只有埋点但没有保存结果的性能数据不写具体数值。

证据判定遵循三类：源码和调用链完整的能力记为“已实现”；机制存在但没有对照数据的效果记为“理论收益”；必须依赖浏览器或真实数据确认的结论记为“待验证”。

## 一、推荐的简历项目描述

### 保守版

负责基于 Vue 3、TypeScript、Pinia 与 OpenLayers 10 开发城市巡检 GIS 综合管理 Demo，封装地图、图层、空间交互和轨迹回放边界，实现事件点位、客户端聚合、热力分析、Polygon/Circle 区域筛选、GeoJSON 导入导出、事件处置联动及 1k～100k Mock 点位切换。通过共享 VectorSource、样式缓存、批量写入、有限 DOM、`shallowRef` 和显式资源销毁控制大数据量场景的前端开销，并对数据生成、Feature 转换、Source 更新和 `rendercomplete` 延迟进行运行时测量。

### 技术亮点版

- 设计 `MapManager + LayerManager + SpatialInteractionManager` 分层架构，将 OpenLayers 命令式对象生命周期与 Vue/Pinia 可序列化业务状态隔离，宿主只通过业务 ID、WGS84 坐标和回调协议通信。
- 构建 Event、Cluster、Heatmap、ResponsibilityGrid、Region、Track、Selection、EventDraft 与 OSM Base 九类图层；普通点、Cluster 和 Heatmap 复用同一事件 `VectorSource`，避免维护多份海量 Feature。
- 实现 1k、10k、50k、100k 可复现 Mock 点位切换，结合 `shallowRef`、批量 `addFeatures`、状态/聚合样式缓存和列表 100 行分页，降低深层响应式、短生命周期对象和 DOM 数量。
- 基于 `VectorSource.forEachFeatureInExtent` 做外接矩形粗筛，再用 `geometry.intersectsCoordinate` 精确判断，实现 Polygon/Circle 区域筛选、修改、保存、恢复及区域内事件批量处置。
- 基于 `requestAnimationFrame` 与轨迹时间戳实现 1x/2x/8x 回放、暂停、重置、时间轴跳转和线段插值；复用人员 Point 和已巡 LineString，避免逐帧创建 Feature。
- 实现 WGS84 与 Web Mercator 边界转换、标准 GeoJSON Point FeatureCollection 导入导出、字段/坐标/重复 ID 校验以及导入结果定位。
- 建立幂等销毁流程，统一解绑 OpenLayers Listener、Interaction、Overlay、Layer、ClusterSource、动画帧和图片 Blob URL，降低页面重复挂载后的资源泄漏风险。

## 二、源码能够证明的技术能力

### 1. 地图初始化与统一门面

**真实能力：** 创建唯一 OpenLayers Map、View、Overlay 和米制 ScaleLine，通过 `mount` 延迟绑定 DOM，通过 `destroy` 统一释放。

**源码证据：**

- `src/map/MapManager.ts`
- `MapManager.constructor`
- `MapManager.mount`
- `MapManager.destroy`

**可以写进简历：** 封装 OpenLayers 地图生命周期和业务命令边界。

### 2. 九类图层和稳定 ID 管理

**真实能力：** OSM Base、Event、Cluster、Heatmap、ResponsibilityGrid、Region、Track、Selection、EventDraft 九类图层，使用稳定 `CoreLayerId` 注册、显隐、移除和销毁。

**源码证据：**

- `src/map/LayerManager.ts`
- `src/map/layers/*.ts`
- `MapManager` 第 165～174 行附近的图层注册链

**可以写进简历：** 设计独立图层工厂和统一图层所有权管理，支持场景化显隐编排。

### 3. 客户端点位聚合

**真实能力：** 使用 OpenLayers `ClusterSource`，`distance=42`、`minDistance=18`；单点沿用事件样式，多点显示聚合数量。

**源码证据：**

- `src/map/layers/create-cluster-layer.ts`
- `src/map/styles/cluster-style.ts`
- `MapManager.setRenderMode`

**可以写进简历：** 实现客户端点位聚合和普通点/Cluster 互斥渲染。

**不能写：** 服务端聚合、矢量瓦片聚合、百万点渲染。

### 4. 空间查询与“电子围栏”基础能力

**真实能力：** Draw/Modify Polygon 和 Circle，保存/恢复 WGS84 区域，筛选区域内事件，并支持区域内批量状态推进。

**源码证据：**

- `src/map/interactions/SpatialInteractionManager.ts`
- `SpatialInteractionManager.setMode`
- `SpatialInteractionManager.emitRegionSelection`
- `src/map/region-geometry.ts`
- `MapManager.showRegion`、`reevaluateCurrentRegion`

**可以写进简历：** 实现 Polygon/Circle 空间范围管理和区域内点位查询。

**不能直接写成：** 完整电子围栏系统。当前没有实时位置流、进入/离开事件、越界告警和围栏规则引擎。

### 4.1 地图交互和业务数据流

**真实能力：** Select、Point/Polygon/Circle Draw 与 Modify 由独立管理器控制且模式互斥；地图只向 Vue 返回事件 ID、WGS84 坐标和区域事件 ID，Vue/Pinia 再驱动详情、列表、筛选和地图命令。

**源码证据：**

- `src/map/interactions/SpatialInteractionManager.ts`
- `MapManager.startEventLocationPick`
- `GisManagementDemo.vue` 的 `onMounted` 回调装配

**可以写进简历：** 建立地图交互到 Vue 业务状态、以及业务状态到地图 Feature 的双向数据流。

### 5. 轨迹回放

**真实能力：** 根据轨迹时间戳和真实帧间隔推进时间，在线段内插值，支持播放、暂停、重置、倍速和 Seek。

**源码证据：**

- `src/services/TrackPlaybackController.ts`
- `TrackPlaybackController.play/pause/reset/setSpeed/seek`
- `TrackPlaybackController.updatePosition`
- `src/map/layers/create-track-layer.ts`

**可以写进简历：** 基于时间戳插值和 `requestAnimationFrame` 实现轨迹回放，并同步已巡路线、节点和责任网格进度。

### 6. Vue 与 OpenLayers 解耦

**真实能力：** Pinia 只保存事件、筛选、业务 ID、责任人、操作记录和区域协议；Map、Layer、Feature、Geometry、Interaction 留在普通 TypeScript 管理器中。

**源码证据：**

- `src/stores/gis.ts`
- `src/map/MapManager.ts`
- `src/components/GisManagementDemo.vue` 的 `onMounted/onBeforeUnmount`

**可以写进简历：** 使用业务 ID 和回调协议隔离响应式状态与地图运行时对象。

### 7. 海量点前端优化

**真实能力：**

- 1k～100k 固定种子 Mock；
- 事件数组使用 `shallowRef`；
- 批量 Feature 转换和 `addFeatures`；
- 普通点、Cluster、Heatmap 共享 Source；
- 事件 Style 按状态缓存；
- Cluster Style 缓存上限 2,048；
- Vue 列表每页最多 100 行；
- Pointer 坐标回调限制为 80ms 一次；
- 单事件新建、更新、删除使用增量 Source API。

**源码证据：**

- `src/mock/generate-events.ts`
- `src/stores/gis.ts`
- `MapManager.setEvents/addEvent/updateEvent/removeEvent`
- `src/map/styles/event-style.ts`
- `src/map/styles/cluster-style.ts`
- `GisManagementDemo.vue` 中 `EVENT_LIST_PAGE_SIZE = 100`

**可以写进简历：** 面向十万级演示数据实施前端对象、渲染和 DOM 控制策略。

**不能写：** 已达到生产级十万点流畅度、FPS 提升百分比或内存降低百分比。仓库没有保存对照实验结果。

### 8. 性能测量

**真实能力：** 页面实时采集最近一次数据生成、Feature 转换、Source 更新和从批量替换到 `rendercomplete` 的耗时。

**源码证据：**

- `MapManager.constructor/setEvents`
- `MapManager` 的 `rendercomplete` Listener
- `GisManagementDemo.vue` 中 `generateEvents` 和性能面板

**可以写进简历：** 建立 GIS 数据更新分阶段性能埋点。

**必须标记：** 仓库没有保存测试设备、浏览器、数据样本和测量结果；任何具体毫秒数均为「待验证」。

### 9. GeoJSON 交换

**真实能力：** 导出标准 WGS84 Point FeatureCollection；导入时校验根协议、Feature、枚举、时间、经纬度、文件内重复 ID 和现有 ID 冲突。

**源码证据：**

- `src/services/export-events.ts`
- `serializeInspectionEventsToGeoJson`
- `parseInspectionEventsGeoJson`
- `GisManagementDemo.vue` 的 `importGeoJson/exportCurrentEvents`

### 10. 资源释放

**真实能力：** 解绑 Listener、移除 Interaction、取消 RAF、移除 Overlay/Layer、清空 Source、解除 ClusterSource、解除 Map Target，并撤销图片 Blob URL。

**源码证据：**

- `MapManager.destroy`
- `LayerManager.destroy`
- `SpatialInteractionManager.destroy`
- `TrackPlaybackController.destroy`
- `GisManagementDemo.vue` 的 `releaseAllEventEvidence/onBeforeUnmount`

### 11. 分层渲染

**真实能力：** 按底图、分析、业务点、区域、轨迹、选中和草稿语义拆分独立 Layer，通过 zIndex、显隐和场景组合进行分层渲染。

**源码证据：**

- `src/map/layers/*.ts`
- `src/map/LayerManager.ts`
- `GisManagementDemo.vue` 的 `changeWorkspaceScene/applyLayerVisibility`

**不能写：** 矢量瓦片 LOD、WebGL 分层或按视口动态装卸图层数据。

## 三、明确不能写进简历的能力

以下能力在当前源码中不存在：

- 按地图视口或 BBOX 请求后端数据；
- 服务端空间索引或 PostGIS；
- 服务端 Cluster；
- 矢量瓦片、MVT、WebGL Points；
- Web Worker 数据转换；
- 实时 WebSocket GPS 轨迹；
- 进入/离开围栏事件和越界告警；
- 离线瓦片和离线地图；
- 多级缓存或瓦片缓存治理；
- 自动化性能基准结果；
- 已验证的 FPS、内存或耗时提升比例。

## 四、简历表述风险检查

| 表述 | 是否安全 | 原因 |
| --- | --- | --- |
| “支持 10 万 Mock 点位切换” | 是 | UI 和生成器均明确支持 100,000 |
| “实现客户端 Cluster 聚合” | 是 | 使用 OpenLayers ClusterSource |
| “实现空间索引查询” | 有条件 | 可说使用 VectorSource extent 粗筛；不能说实现了自研 R-tree |
| “实现电子围栏” | 不建议 | 只有区域绘制、保存和点内查询，没有告警语义 |
| “实现视口加载” | 否 | 没有按 extent 请求或卸载数据 |
| “性能提升 60%” | 否 | 没有基线与结果记录 |
| “实现增量更新” | 是 | 单事件 add/update/remove 为增量；筛选和换数据仍是批量替换 |
| “完整资源回收” | 基本安全 | 有显式销毁链；浏览器实际内存回收效果仍需工具验证 |

## 五、面试时必须主动说明的边界

1. 十万点是前端固定 Mock，不是一次从生产接口拉取十万条数据的推荐方案。
2. Cluster 降低低 Zoom 下的绘制和命中压力，但不会减少业务对象、原始 Feature 创建和网络成本。
3. `forEachFeatureInExtent` 使用的是 OpenLayers VectorSource 内部空间索引能力，不是项目自研空间索引。
4. 当前“围栏”是静态区域筛选，不包含实时人员越界告警。
5. 性能面板能测量当前运行，但仓库没有固定测试环境和历史结果，不能承诺具体提升。
6. 单事件操作使用增量更新；改变筛选、数据量或批量状态后会整体重建当前可见 Source。

## 六、必须脱离 Codex 掌握的简历亮点

- 能画出 Vue/Pinia → MapManager → Source/Layer，以及地图回调 → Pinia 的双向数据流；
- 能解释 ClusterSource 为什么没有减少原始 Feature；
- 能手写 WGS84/Web Mercator 转换边界；
- 能解释 extent 粗筛与精确点面判断；
- 能推导轨迹时间插值公式；
- 能区分单事件增量更新和筛选后的批量重建；
- 能逐项说明 Listener、Interaction、RAF、Overlay、Source、Layer 和 Blob URL 如何释放；
- 能诚实说明视口加载、实时围栏告警和性能对照数据尚未实现。
