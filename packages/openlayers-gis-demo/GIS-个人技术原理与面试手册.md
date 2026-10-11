# GIS 个人技术原理与面试手册

本文以当前真实源码为唯一事实依据，目标是帮助项目作者在高级前端面试中脱离 Codex，独立解释架构、定位实现、回答追问并完成修改。

## 1. 阅读规则和结论等级

本文使用三种结论：

- **已实现：** 源码中存在完整调用链；
- **理论收益：** 代码采用了合理优化，但仓库没有对照实验结果；
- **待验证：** 需要浏览器、性能面板、Memory/Performance 工具或真实数据才能确认。

不得把理论收益或待验证项说成已经量化证明的结果。

## 2. 项目入口和宿主加载链

### 2.1 实际调用链

```text
Vue Router
→ apps/web/src/pages/PlaygroundGisPage.vue（懒加载页面）
→ 从 @blog/openlayers-gis-demo 导入 GisManagementDemo
→ packages/openlayers-gis-demo/src/index.ts
→ src/components/GisManagementDemo.vue
→ onMounted 创建 MapManager
→ MapManager 创建 Map、Layer、Source、Interaction 和轨迹控制器
→ mount 绑定地图 DOM 与 Popup DOM
```

### 2.2 源码位置

- 路由：`apps/web/src/app/router/index.ts`
- 宿主页：`apps/web/src/pages/PlaygroundGisPage.vue`
- Package 公共入口：`src/index.ts`
- 主组件：`src/components/GisManagementDemo.vue`

### 2.3 面试回答

**问题：为什么 GIS 做成独立 Package，而不是全部写在页面里？**

标准答案：宿主页面只负责路由和展示容器，GIS Package 拥有组件、类型、状态、地图运行时与服务。这样可以控制依赖方向、形成公共入口，并让 OpenLayers 生命周期不会散落到应用路由层。当前 Package 仍导出了部分高级管理器，便于复用和诊断。

**追问：Package 是否完全独立？**

回答：运行时仍要求宿主提供 Vue 和 Pinia，`package.json` 将它们同时列为 peer/dev dependency；底图还依赖在线 OSM。它是独立 Feature Package，不是无依赖 SDK。

## 3. 地图初始化

### 3.1 核心实现

文件：`src/map/MapManager.ts`

`MapManager.constructor` 完成：

1. 创建 OSM Base Layer；
2. 将初始 `InspectionEvent[]` 转成 Point Feature；
3. 创建 Event Source 和九类 Layer；
4. 创建 OpenLayers Map 和 View；
5. 创建 Overlay；
6. 注册所有 Layer；
7. 创建 SpatialInteractionManager；
8. 创建 TrackPlaybackController；
9. 注册 moveend、rendercomplete、pointermove 监听。

核心代码：

```ts
this.map = new OlMap({
  controls: defaultControls({ rotate: false }).extend([
    new ScaleLine({ units: 'metric' }),
  ]),
  view: new View({
    center: fromLonLat([...(options.center ?? DEFAULT_CENTER)]),
    zoom: options.zoom ?? 12,
    minZoom: 3,
    maxZoom: 20,
  }),
})
```

构造时不传 target。`mount` 才调用 `map.setTarget(target)`，同时绑定 Popup 元素并执行 `updateSize`。这让 Map 的所有权属于管理器，又允许 Vue 在 DOM 挂载后提供真实容器。

### 3.2 关键设计取舍

- 初始中心使用上海附近 WGS84 坐标，再通过 `fromLonLat` 转为 Web Mercator；
- 关闭 rotate，降低演示交互复杂度；
- ScaleLine 使用 metric；
- Map 实例只创建一次，筛选和场景切换不重建 Map；
- Overlay 专门承载 Popup，Selection Layer 专门承载高亮，两者与原事件 Feature 解耦。

### 3.3 面试问答

**问题：为什么不能在 Vue computed 或 watch 中重新 new Map？**

标准答案：Map 是包含 DOM、渲染循环、Listener、Source、Interaction 的有状态对象。响应式更新时重建会丢失视图状态、重复监听、增加资源泄漏风险。当前实现只在 `onMounted` 创建一次，通过命令式方法更新内部对象。

**连续追问：如果容器尺寸改变怎么办？**

当前答案：首次挂载调用 `updateSize`。源码没有 ResizeObserver，因此宿主布局持续变化后的自动尺寸同步属于未实现项；生产版本应在容器尺寸变化时节流调用 `map.updateSize()`。

## 4. 图层管理和分层渲染

### 4.1 九类图层

| ID | 文件 | 数据 | zIndex/职责 |
| --- | --- | --- | --- |
| `base` | `create-base-layer.ts` | OSM TileSource | 0，基础底图 |
| `heatmap` | `create-heatmap-layer.ts` | 共享 Event Source | 8，风险密度 |
| `responsibilityGrid` | `create-responsibility-grid-layer.ts` | 本地 4×3 Polygon | 9，网格覆盖 |
| `event` | `create-event-layer.ts` | Event Source | 10，普通点位 |
| `cluster` | `create-cluster-layer.ts` | ClusterSource(Event Source) | 点位聚合 |
| `region` | `create-region-layer.ts` | Region Source | 20，绘制区域 |
| `track` | `create-track-layer.ts` | Track Source | 25，轨迹和人员 |
| `selection` | `create-selection-layer.ts` | 单 Feature Source | 40，选中光圈 |
| `eventDraft` | `create-event-draft-layer.ts` | 单 Feature Source | 临时选点 |

### 4.2 LayerManager

文件：`src/map/LayerManager.ts`

```ts
addLayer(layerId: CoreLayerId, layer: BaseLayer): void {
  if (this.layers.has(layerId)) throw new Error(`Layer 已存在：${layerId}`)
  layer.set('layerId', layerId)
  this.layers.set(layerId, layer)
  this.map.addLayer(layer)
}
```

核心价值不是封装 `map.addLayer` 这一行，而是建立图层所有权：

- 一个业务 ID 只对应一个 Layer；
- Vue 不持有 Layer；
- 显隐不销毁 Source；
- `destroy` 可遍历移除全部 Layer。

### 4.3 分层渲染是否真实存在

**已实现：** 不同业务语义拆成独立 Layer，通过 zIndex、可见性和场景模式组合渲染。

**没有实现：** 瓦片级 LOD、自定义渲染批次、WebGL Layer、服务端分层加载。

### 4.4 面试问答

**问题：为什么选中态不直接改 Event Feature 样式？**

标准答案：Selection Layer 使用一个独立 Feature，并克隆目标 Point Geometry。它不污染原事件属性和 Style Cache，在 point/cluster 模式切换后仍能保留稳定的高亮语义。

**追问：隐藏 Layer 和移除 Layer 有什么区别？**

回答：隐藏只调用 `setVisible(false)`，Source 和注册关系仍存在，适合场景切换；移除会从 Map 和 LayerManager 中删除，最终销毁时不再管理该实例。

## 5. 点位数据、Feature 和坐标转换

### 5.1 业务数据

`InspectionEvent` 使用 WGS84 `lng/lat`。当前事件由 `generateInspectionEvents` 使用固定随机种子在上海附近生成，可选 1k、10k、50k、100k。

### 5.2 Feature 转换

文件：`src/map/sources/create-event-source.ts`

```ts
const feature = new Feature<Point>({
  geometry: new Point(fromLonLat([event.lng, event.lat])),
})
feature.setId(event.id)
feature.setProperties({
  eventId: event.id,
  eventType: event.type,
  status: event.status,
  level: event.level,
})
```

业务层保存 WGS84，地图层保存投影坐标。`event.id` 同时成为 Feature ID，因此可以通过 `getFeatureById` 直接定位，而不需要由业务代码遍历全部 Feature；具体索引结构和复杂度由 OpenLayers 实现决定，当前项目没有自行做复杂度基准。

### 5.3 面试问答

**问题：为什么不能直接把经纬度传给默认 View？**

标准答案：OpenLayers 默认 View 使用 EPSG:3857，业务经纬度通常是 EPSG:4326。需要 `fromLonLat` 进入地图，`toLonLat` 回到业务层，否则位置和距离语义错误。

**追问：当前 Circle 半径为什么需要乘/除 cos(latitude)？**

回答：Web Mercator 局部尺度随纬度变化。项目序列化时用投影半径乘 `cos(latitude)` 还原近似地表米数，反序列化时反向换算。它适合当前城市级演示，但不是椭球上的高精度测地圆。

## 6. 点位聚合

### 6.1 实现

文件：`src/map/layers/create-cluster-layer.ts`

```ts
const source = new ClusterSource({
  distance: 42,
  minDistance: 18,
  source: eventSource,
})
```

- `distance` 和 `minDistance` 都是屏幕像素；
- ClusterSource 包装 Event Source；
- 一个 Cluster 内只有一个事件时返回原事件 Style；
- 多事件使用数量气泡；
- `MapManager.setRenderMode` 保证 Event Layer 与 Cluster Layer 互斥。

### 6.2 Cluster 能优化什么

**理论收益：** 低 Zoom 下减少同屏绘制符号和用户命中对象，降低视觉遮挡。

**不能优化：**

- 业务数组的内存；
- 原始 Feature 的创建成本；
- 前端收到数据的网络成本；
- 高 Zoom 下点位分散后的全部绘制成本。

### 6.3 面试追问

**追问：Cluster 是否减少 Event Source 中的 Feature 数量？**

回答：不减少原始 Source。ClusterSource 根据当前分辨率产生聚合 Feature；项目性能面板在 Cluster 模式显示 ClusterSource 当前 Feature 数量，但原始事件 Feature 仍存在。

**追问：十万点为什么不用 WebGL？**

回答：当前项目选择 Canvas + Cluster 展示工程边界，并提供分阶段耗时测量。是否升级 WebGL 应根据真实浏览器测量决定；当前不能声称 Canvas 已满足所有生产设备。

## 7. 地图交互

### 7.1 Select

`SpatialInteractionManager` 同时配置 Event Layer 和 Cluster Layer。点击普通点返回事件 ID；点击多事件 Cluster 时，实际行为需要结合 Select 回调源码说明：项目不会把聚合对象当业务事件直接写入 Store，而是处理可识别的事件 Feature。

MapManager 收到 ID 后：

```text
getFeatureById
→ clone Geometry 到 Selection Feature
→ Popup 设置坐标
→ onEventSelect(eventId)
→ Pinia selectedEventId
→ 详情和列表页联动
```

### 7.2 Draw 和 Modify

支持 `Point | Polygon | Circle` Draw。Draw 是按类型动态创建的；切换模式时解绑旧 Draw Listener 并从 Map 移除 Interaction。Modify 固定操作 Region Source。

模式切换先停用全部主动交互，再激活 select/draw/modify 中的一种，避免点击、拖拽和绘制竞争。

### 7.3 事件位置选取

`MapManager.startEventLocationPick` 临时关闭所有 Interaction，独占下一次 `singleclick`，将地图坐标转换成 WGS84，更新 EventDraft Feature，然后恢复原交互模式。

### 7.4 面试问答

**问题：为什么一次性选点不用 Draw(Point)？**

标准答案：源码使用独占的 `singleclick`，因为它只需要下一次坐标并立即恢复原模式；同时用独立草稿层展示结果。Draw(Point) 也可实现，但需要额外管理 Draw 生命周期和结果 Source。

**追问：如何避免旧 Draw 重复响应？**

回答：`removeDraw` 对 `drawListenerKeys` 调用 `unByKey`，从 Map 移除 Draw，并清空引用。

## 8. 区域筛选与电子围栏边界

### 8.1 已实现能力

- Polygon/Circle 绘制；
- Modify；
- 当前区域保存；
- WGS84 序列化和恢复；
- 预设区域加载和 View.fit；
- 区域内事件筛选；
- 事件集更新后重新计算；
- 区域内事件批量推进。

### 8.2 空间查询

文件：`src/map/interactions/SpatialInteractionManager.ts`

```ts
this.options.eventSource.forEachFeatureInExtent(geometry.getExtent(), (feature) => {
  const coordinate = feature.getGeometry()?.getCoordinates()
  const id = feature.getId()
  if (coordinate && geometry.intersectsCoordinate(coordinate) && typeof id === 'string') {
    eventIds.push(id)
  }
})
```

这是两阶段查询：

1. `forEachFeatureInExtent` 利用 VectorSource 的内部空间索引按外接矩形粗筛；
2. `intersectsCoordinate` 做 Polygon/Circle 精确点包含判断。

项目没有自研 R-tree，也没有 PostGIS。

### 8.3 为什么不能称为完整电子围栏

完整电子围栏通常还需要：

- 实时位置流；
- 进入、离开、停留判定；
- 边界抖动处理；
- 告警规则和去重；
- 后台持续计算与消息通知。

当前项目只有静态区域定义和区域内事件查询。因此面试中应说“具备电子围栏的区域建模与点内查询基础”，不能说已经实现完整告警系统。

### 8.4 连续追问

**追问：大量动态人员如何判断进出围栏？**

标准答案：不能每次遍历全部围栏。应先对围栏 envelope 建空间索引，候选缩小后做精确点面判断；为每个实体保存上一帧 inside/outside 状态，状态变化才生成 enter/leave；边界附近增加滞回、停留时间或精度半径处理。当前源码未实现。

## 9. 轨迹回放

### 9.1 数据和 Layer

`src/mock/tracks.ts` 提供 12 个按时间升序排列的 WGS84 点，蛇形经过责任网格中心。`create-track-layer.ts` 一次创建：

- 未巡完整 LineString；
- 已巡 LineString；
- 人员 Point；
- 12 个 Checkpoint Point。

### 9.2 时间推进

文件：`src/services/TrackPlaybackController.ts`

播放开始时记录 `performance.now()`，每帧计算：

```text
currentElapsed = 已结算时间 + (当前帧时间 - frameStartedAt) × speed
targetTimestamp = 起始轨迹时间 + currentElapsed
```

再找到 targetTimestamp 所在相邻采样点，计算 `[0,1]` 比例并线性插值投影坐标。

### 9.3 为什么不按数组索引移动

按索引移动会让速度依赖采样间隔和帧率。按时间戳插值后，采样点不均匀时仍能保持时间语义；倍速也只改变时间推进比例。

### 9.4 资源和状态

- 重复 `play` 不会启动第二个 RAF；
- `pause` 先结算时间并精确更新位置；
- `setSpeed` 在播放中先结算旧倍率；
- `seek` 限制在 `[0,1]`；
- `destroy` 取消 RAF；
- 每帧复用原 Feature，只改变 Geometry。

### 9.5 面试追问

**追问：线性插值是否代表匀速沿地球表面？**

回答：当前是在 Web Mercator 投影坐标的相邻点之间线性插值，适合短距离城市演示。长距离或高精度场景应做测地线插值，并处理跨日期变更线等问题。

**追问：后台标签页会怎样？**

回答：浏览器会节流 RAF，但代码用 `performance.now()` 的时间差计算当前位置，恢复后可能直接推进较大时间。是否要暂停、补帧或跟随服务端时间取决于产品语义；当前没有 visibilitychange 处理，属于待改进项。

## 10. 视口加载核查

### 10.1 结论

**已实现前端 Mock BBOX 视口加载，但尚未接入真实 HTTP/数据库后端。**

实际调用链：

```text
MapManager mount / moveend
→ calculateWgs84ViewportBbox
→ GisManagementDemo.queryViewport
→ ViewportQueryController.query
→ MockViewportEventService.query
→ SpatialGridIndex.queryCandidates
→ 真实 BBOX + 业务筛选精筛
→ Pinia.replaceViewportEvents
→ MapManager.syncEvents
```

关键实现：

- `viewport-bbox.ts` 使用 `transformExtent` 把当前投影 extent 转为闭区间 WGS84 BBOX；
- `ViewportQueryController` 同时使用 AbortController、request ID 和 datasetVersion；
- Mock Service 使用向外量化 BBOX 的有界 LRU，命中后按真实 BBOX 再精筛；
- 普通错误保留旧地图，空结果与错误分开；
- Pinia 和 Event Source 只持有当前视口结果。

核心代码的提交门禁在 Controller：

```ts
const result = await service.query({
  bbox: paramsSnapshot.bbox,
  filter: paramsSnapshot.filter,
  signal: abortController.signal,
})
if (requestId !== nextRequestId) return
if (result.datasetVersion !== paramsSnapshot.expectedDatasetVersion) return
```

缓存范围必须向外扩张，不能用四舍五入缩小真实视口：

```ts
const quantizedBbox: Wgs84Bbox = [
  floorToCell(minLongitude),
  floorToCell(minLatitude),
  ceilToCell(maxLongitude),
  ceilToCell(maxLatitude),
]
const events = cached.events.filter((event) => isEventInsideBbox(event, realBbox))
```

这里省略了源码中的 WGS84 上下限裁剪，但保留了最重要的“外扩缓存、真实范围精筛”顺序。

未实现：真实 HTTP、PostGIS、服务端 Cluster、VectorSource loader/bbox strategy、Zoom 参数和矢量瓦片。

### 10.2 面试标准答案

**问题：项目是否做了视口加载？**

回答：实现了可运行的前端 Mock 视口加载。`moveend` 后把 extent 转为 WGS84 BBOX，通过框架无关 Service 查询；Controller 负责取消、request ID 和数据集版本保护，结果按 ID Diff 到 Source。它证明的是前端协议和请求治理，不等于已经有生产后端；生产化时替换 Service Adapter，并由 PostGIS 或其他服务端索引执行 BBOX 查询。

**连续追问：为什么 AbortController 之外还需要 request ID？**

回答：取消信号存在传播窗口，异步步骤也可能忽略 signal。request ID 在提交点再次判断“是否仍是最新请求”，防止迟到响应覆盖。datasetVersion 再隔离数据集切换前后的响应，三者处理不同失效维度。

## 11. 空间索引核查

### 11.1 真实存在的部分

- `SpatialGridIndex` 按 `floor(lng/cellSize)`、`floor(lat/cellSize)` 建固定网格，用于 Mock BBOX 候选缩小；
- OpenLayers VectorSource 为 Feature 查询提供内部空间索引；
- 区域查询调用 `forEachFeatureInExtent`；
- `getFeatureById` 用于业务 ID 定位；
- `fitEvents` 直接遍历 Source 累加 extent，避免额外坐标数组。

### 11.2 不应夸大的部分

- 没有自研 R-tree；
- 没有数据库空间索引；
- 固定网格构建耗时和候选数可在页面观察，但没有固定环境对照基准；
- 不能声称查询复杂度已经在本项目中实测为某个量级。

**问题：固定网格和 R-tree 有什么区别？**

标准答案：固定网格按确定单元直接分桶，实现简单，适合分布范围已知的城市 Mock 点；数据倾斜或跨尺度查询时可能出现热点桶和大量空桶遍历。R-tree 以层级包围盒组织对象，适合更通用的空间范围查询。当前实现只能称固定经纬度网格，不能包装成 R-tree。

## 12. 增量更新核查

### 12.1 单事件增量更新

`MapManager` 实现：

- `addEvent` → `eventSource.addFeature`；
- `updateEvent` → 查找原 Feature，更新 properties 和 Point Geometry；
- `removeEvent` → `eventSource.removeFeature`。

更新时保留 Feature 身份，有利于减少不必要对象创建和索引重建。

### 12.2 视口结果 ID Diff

`syncEventSource` 一次建立新结果 `eventId → event` Map，遍历旧 Feature 删除缺失项、比较并更新变化项，再批量添加剩余新项。比较范围是进入 Feature 的 `eventId/type/status/level` 和投影坐标；address/createdAt 只在 Vue 业务对象更新。未变化与更新 Feature 都保持对象身份。

核心循环：

```ts
for (const feature of source.getFeatures()) {
  const featureId = feature.getId()
  const nextEvent = typeof featureId === 'string' ? nextEventsById.get(featureId) : undefined
  if (!nextEvent) {
    featuresToRemove.push(feature)
    continue
  }
  if (hasEventFeatureChanged(feature, nextEvent)) updateEventFeature(feature, nextEvent)
  nextEventsById.delete(featureId)
}
```

`setEvents` 仍保留给数据集版本切换和明确重置，此时允许 `clear(true) + addFeatures`。

### 12.3 面试回答

**问题：项目是否全部采用增量更新？**

标准答案：当前正常视口和筛选响应使用 ID Diff，单事件 CRUD 也使用增量 API；完整数据集版本切换才整体重置。Diff 自身有构建 Map 和字段比较成本，因此仍需根据变化率和结果规模测量，不能无条件声称优于重建。

## 13. 性能优化与证据等级

### 13.1 已实现的优化机制

| 技术 | 源码证据 | 预期作用 | 是否有量化结果 |
| --- | --- | --- | --- |
| 当前视口 Store | `mock-viewport-event-service.ts`、`stores/gis.ts` | 完整数据集不进入 Vue/地图 | 有数量指标，无内存对照 |
| 固定网格候选 | `spatial-grid-index.ts` | 缩小 Mock BBOX 精筛输入 | 有候选/命中指标，无线性扫描对照 |
| 有界查询 LRU | `mock-viewport-event-service.ts` | 复用量化 BBOX 与筛选结果 | 有命中状态，无长期命中率样本 |
| Feature ID Diff | `sync-event-source.ts` | 保留身份并只处理变化项 | 有计数/耗时，无重建对照 |
| `shallowRef<InspectionEvent[]>` | `stores/gis.ts` | 避免当前视口对象深层 Proxy | 无，待验证 |
| ClusterSource | `create-cluster-layer.ts` | 减少低 Zoom 绘制符号 | 无，待验证 |
| Source 共享 | `MapManager` | 避免 Event/Cluster/Heatmap 多份 Feature | 无内存对照，待验证 |
| 批量 `addFeatures` | `MapManager.setEvents` | 数据集重置时避免逐条触发 | 无逐条对照，待验证 |
| Event Style Cache | `event-style.ts` | 减少 Style 分配 | 无 GC 对照，待验证 |
| Cluster Style Cache | `cluster-style.ts` | 减少 Style/Text 分配 | 无 GC 对照，待验证 |
| 缓存上限 2,048 | `cluster-style.ts` | 防止样式缓存无限增长 | 无长期内存数据 |
| 列表每页 100 行 | `GisManagementDemo.vue` | 限制 Vue DOM | 已有上限，无性能对照 |
| Pointer 80ms 节流 | `MapManager.ts` | 降低高频响应式更新 | 无前后对照 |
| Feature 复用 | Selection/Track/Event update | 减少动画和更新分配 | 无 GC 对照 |

### 13.2 已实现的测量

项目使用 `performance.now()` 测量：

- 完整 Mock 数据生成和固定网格构建；
- BBOX 纯查询；
- Event Source ID Diff；
- Diff 开始到 `rendercomplete`。

同时记录 datasetSize、indexedCellCount、candidateCount、matchedCount、cacheHit 和 added/updated/removed/unchanged。以上是测量能力，不是已经完成的优化前后结论。

1. Mock 业务数据生成；
2. `InspectionEvent[] → Feature[]`；
3. `VectorSource.clear/addFeatures`；
4. 从批量替换开始到 `rendercomplete`。

UI 会显示最近一次结果。

### 13.3 测量的限制

- 仓库没有保存任何结果；
- 没有固定设备、浏览器版本、热身次数和样本次数；
- `rendercomplete` 延迟包含调度和渲染，但不是完整用户体验指标；
- 没有 FPS、Long Task、内存峰值或 GC 指标；
- 没有优化前代码和 A/B 对照。

因此“优化前后实际依据”的正确结论是：**存在可运行的分段测量埋点，但不存在可复核的优化前后结果。具体数值全部标记为待验证。**

### 13.4 如何补齐真实性能证据

应由用户手动在固定环境记录：

- 设备/CPU/内存、浏览器版本、屏幕尺寸；
- 1k/10k/50k/100k；
- point/cluster；
- 首次与重复运行；
- 每组至少多次样本的中位数/P95；
- Performance 面板中的 Long Task、帧率和 GC；
- Memory 中切换数据和卸载页面前后的 Heap Snapshot。

本次未执行页面测试，因此没有新增这些结果。

## 14. 资源释放

### 14.1 完整调用链

```text
GisManagementDemo.onBeforeUnmount
├── releaseAllEventEvidence
│   └── URL.revokeObjectURL
└── MapManager.destroy
    ├── cancelEventLocationPick → unByKey
    ├── map.setTarget(undefined)
    ├── unByKey(map listenerKeys)
    ├── SpatialInteractionManager.destroy
    │   ├── removeDraw + unByKey(draw listeners)
    │   └── remove Select/Modify + unByKey
    ├── TrackPlaybackController.destroy → cancelAnimationFrame
    ├── remove Overlay
    ├── clear selection/draft
    ├── eventSource.clear(true)
    ├── clusterSource.setSource(null)
    └── LayerManager.destroy
```

`MapManager.destroy` 使用 `destroyed` 标记实现幂等。

### 14.2 面试追问

**问题：调用 removeLayer 就等于所有资源都释放了吗？**

回答：不等于。还要解绑 Listener、Interaction、Overlay、RAF、DOM Listener 和 Source 间引用。JS 内存何时真正回收由 GC 决定，是否无泄漏需要 Heap Snapshot 验证。

## 15. Vue 3 与 OpenLayers 职责划分

### 15.1 Vue/Pinia 负责

- 筛选、排序、分页；
- 事件业务状态；
- 责任人和操作记录；
- 区域业务协议和 eventIds；
- 表单、弹窗、图片；
- 场景和 UI 控件；
- 统计和 SLA；
- 将业务变化翻译为 MapManager 命令。

### 15.2 OpenLayers 管理器负责

- Map/View/Overlay；
- Layer/Source/Feature/Geometry；
- 坐标投影；
- Select/Draw/Modify；
- 空间查询；
- 地图定位和 fit；
- 地图事件和渲染指标；
- 轨迹 Feature 更新。

### 15.3 为什么 Map 对象不进 Pinia

OpenLayers 对象包含原型、循环引用、内部缓存和事件系统，不适合序列化；Vue 深层代理也可能影响对象身份和访问成本。项目通过 eventId、WGS84 坐标、数组和回调沟通。

### 15.4 当前架构弱点

`GisManagementDemo.vue` 超过 3,700 行，承担 UI、统计、业务流程、文件处理和场景编排，已经是明显的高复杂度单文件。虽然地图运行时被拆出，但页面业务仍可进一步拆成 composable 和子组件。该问题是真实存在的，面试时可以主动说明下一步治理方向。

## 16. 完整数据流

### 16.1 初始化

```text
generateInspectionEvents(count)
→ Pinia.setEvents
→ computed operationalFilteredEvents
→ new MapManager({ events })
→ createEventFeature + fromLonLat
→ Event VectorSource
→ Event/Cluster/Heatmap Layer
→ mount DOM
→ rendercomplete
→ MapStats 回调到 Vue
```

### 16.2 筛选

```text
用户提交筛选
→ Store.setEventFilter
→ filteredEvents
→ 叠加 SLA/责任人/区域得到 scopedEvents
→ syncVisibleEvents
→ MapManager.setEvents
→ clear + addFeatures
→ 地图和性能面板更新
```

### 16.3 地图选中

```text
Select Interaction
→ 提取 eventId
→ MapManager 更新 Selection/Popup
→ onEventSelect
→ Pinia.selectedEventId
→ selectedEvent/详情/列表页码/高亮行
```

### 16.4 单事件编辑

```text
表单保存
→ Store.updateEvent（替换业务对象并追加活动）
→ 若仍可见：MapManager.updateEvent
→ updateEventFeature（保留 Feature 身份）
→ properties + Point Geometry 更新
```

### 16.5 区域

```text
Draw/Modify 完成
→ Region Source Geometry
→ extent 粗筛 + intersectsCoordinate 精筛
→ eventIds 回调
→ Pinia.regionEventIds
→ scopedEvents/统计/列表
```

### 16.6 轨迹

```text
播放命令
→ TrackPlaybackController
→ RAF + elapsed × speed
→ 时间戳定位相邻点
→ 坐标插值
→ 人员 Point/已巡 LineString 更新
→ onTrackTimeChange
→ Vue 更新进度、里程和网格状态
```

## 17. 高级面试问题与连续追问

### 17.1 为什么 Source 共享是优势，也有什么风险？

标准答案：Event、Cluster、Heatmap 共享原始 Event Source，避免三份 Feature 和同步逻辑。风险是 Source 更新会同时影响所有依赖图层；必须保证不同图层只读取属性而不互相修改 Feature。Heatmap 和 Cluster 都是视图层包装，业务身份仍以 Event Source 为准。

追问：如果 Heatmap 需要不同数据集怎么办？

回答：可以创建派生 Source，但要明确同步策略、内存代价和更新频率；或让 weight 返回 0 排除不需要的 Feature。当前项目采用后者处理已完成事件的弱权重，而不是彻底剔除。

### 17.2 为什么正常查询使用 ID Diff，数据集切换仍整体重置？

标准答案：同一数据集内的视口变化有稳定事件 ID，适合删除缺失项、就地更新变化项并添加新项，选择态和 Feature 身份也容易保持。切换 1k/10k/50k/100k 会改变完整数据集版本，旧请求、缓存和身份整体失效，此时先清空再查询新版本，语义更明确。

追问：Diff 一定比重建快吗？

回答：不一定。Diff 需要构建新 Map、遍历旧 Feature 和比较字段；当结果很小或几乎全部变化时，重建可能更简单。项目记录 Diff 耗时和变更计数，但尚未保存不同变化率的对照数据，所以只说明机制，不承诺性能倍数。

### 17.3 Style Cache 为什么重要？

标准答案：Style 回调会在渲染期间高频调用。如果每次创建 Style/Fill/Stroke/Text，会增加短生命周期对象和 GC 压力。状态只有三种，事件 Style 很适合永久缓存；Cluster 数量组合较多，因此设置 2,048 上限。

追问：直接 `CACHE.clear()` 有什么问题？

回答：达到上限时会整体失去命中，后续产生一轮重建抖动。生产可使用 LRU 或按数量区间归一化，但当前实现优先简单和有界。

### 17.4 为什么 Pointer 用 80ms 节流？

标准答案：pointermove 频率可能接近设备采样率，坐标展示不需要每帧更新。80ms 约 12.5Hz，能降低投影转换、回调和 Vue 渲染频率。

追问：这是 throttle 还是 debounce？

回答：是时间戳节流；达到间隔就立即发送，不等待停止移动。

### 17.5 如何证明没有泄漏？

标准答案：源码具备显式释放链只能说明有防护，不能等价于证明无泄漏。应反复进入/离开页面，比较 Heap Snapshot 中 Map、Feature、Listener 和 Blob 数量，并确认 RAF/事件不再执行。

### 17.6 为什么列表分页而地图不分页？

标准答案：DOM 行成本远高于 Canvas 批量绘制，分页把 UI DOM 固定到 100 行；地图表达当前视口空间分布，因此持有当前视口 Feature。更大生产数据还可以使用服务端聚合或矢量瓦片，而不是扩大单次 BBOX 结果。

### 17.7 `rendercomplete` 能代表首屏性能吗？

标准答案：只能代表从记录起点到 OpenLayers 完成一轮渲染的延迟，受浏览器调度和瓦片状态影响；它不是 FCP/LCP，也不能单独代表交互流畅度。项目将其作为一个阶段指标，而非完整性能结论。

### 17.8 GeoJSON 导入为什么需要两层校验？

标准答案：根协议错误意味着整个文件不可解释，应直接失败；单 Feature 错误可以跳过并继续导入合法数据。Store 再检查与现有 ID 冲突，避免文件覆盖当前业务状态。

## 18. 必须脱离 Codex 掌握的内容

### A 级：必须能独立讲清并修改

1. `MapManager` 构造、mount、destroy 完整生命周期；
2. WGS84 与 Web Mercator 转换位置和原因；
3. Event Source、Event Layer、ClusterSource、Heatmap 的关系；
4. `setRenderMode` 为什么让 point/cluster 互斥；
5. `SpatialInteractionManager.setMode/removeDraw/destroy`；
6. extent 粗筛和 `intersectsCoordinate` 精筛；
7. `TrackPlaybackController` 的 elapsed、speed、timestamp、ratio；
8. `syncEvents` ID Diff、单事件 API 与数据集切换 `setEvents` 的区别；
9. Pinia 为什么只保存可序列化业务状态；
10. 资源释放链和每种资源不释放的后果。

### B 级：必须能独立定位和修复

1. 新增一个事件状态及其样式、筛选、排序和状态机影响；
2. 新增一个 Layer 并接入 LayerManager、场景显隐和 destroy；
3. 修改 Cluster distance、样式缓存策略并解释影响；
4. 新增 GeoJSON 字段并更新导入校验与导出协议；
5. 修复轨迹倍速切换或 Seek 后的位置错误；
6. 排查重复进入页面后的 Listener/RAF/Blob 泄漏；
7. 修改 Feature ID Diff 比较字段并保持选择失效语义；
8. 为容器尺寸变化补充 ResizeObserver；
9. 把 Mock `ViewportEventService` 替换为真实 HTTP BBOX Adapter；
10. 将 3,700 行主组件拆成业务 composable 和展示组件。

### C 级：面试前必须亲自完成的待验证项

1. 在固定浏览器记录 1k/10k/50k/100k 的四段耗时；
2. 对比 point 与 cluster 的帧率、Long Task 和交互感受；
3. 做至少一次 Heap Snapshot，验证卸载后 Map/Feature/Blob 可回收；
4. 手动验证 Polygon/Circle 边界点语义；
5. 手动验证后台标签页恢复后的轨迹行为；
6. 解释一次真实的性能瓶颈定位过程，而不是只背优化列表。

## 19. 一分钟项目讲解模板

这个项目是基于 Vue 3、Pinia 和 OpenLayers 的城市巡检 GIS Demo。架构上，我没有把 Map、Layer、Feature 这类命令式对象放进响应式状态，而是用 MapManager 管地图生命周期、LayerManager 管九类图层、SpatialInteractionManager 管 Select/Draw/Modify，Vue 和 Pinia 只保存可序列化业务数据，通过事件 ID、WGS84 坐标和回调通信。

数据层支持 1 千到 10 万固定种子 Mock，但完整数据只存在于框架无关 Service。地图在 mount 和 moveend 后查询 WGS84 BBOX，Service 用固定网格缩小候选并用有界 LRU 复用结果；Controller 通过 Abort、request ID 和 datasetVersion 防止旧响应提交。Pinia 和 OpenLayers 只持有当前视口，Source 按事件 ID Diff。

空间能力包括 Polygon/Circle 绘制、修改、保存和区域内事件查询，先用 VectorSource extent 空间索引粗筛，再做精确点包含判断。轨迹回放按照时间戳和 RAF 时间差推进，在线段内插值，并复用 Point 和 LineString Feature。

项目对数据生成、索引构建、候选/命中、缓存、查询、Feature Diff 和 rendercomplete 做了分阶段计时，但没有保存固定环境下的优化前后结果，所以不会编造提升比例。当前视口加载是前端 Mock Service；真实 HTTP/PostGIS、服务端聚合和实时越界告警仍是生产化方向。
