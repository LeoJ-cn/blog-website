# 城市巡检 GIS 项目开发与实现说明

本文面向希望了解项目真实开发过程的开发者，重点说明 `@blog/openlayers-gis-demo` 使用了什么数据、数据从哪里来、如何进入地图、各项功能如何实现，以及当前演示版本与生产系统之间的边界。

与 `README.md` 的项目概览不同，本文以源码模块、数据协议和核心代码为主。文中的“已实现”均对应当前 Package 内的实际代码。

## 1. 项目解决的问题

该项目模拟城市巡检业务的完整前端工作台：工作人员在地图上查看道路破损、路灯故障、垃圾堆积和井盖异常等事件，通过列表、地图和统计面板完成筛选、定位、分派、处置、空间圈选、批量推进、GeoJSON 交换以及巡检轨迹复盘。

项目同时承担 OpenLayers 工程实践演示，因此不仅展示地图，还刻意覆盖以下技术问题：

- Vue 声明式状态与 OpenLayers 命令式对象的边界管理；
- 1 万到 10 万点位的前端生成、转换、聚合和渲染；
- WGS84 业务坐标与 Web Mercator 地图坐标的转换；
- Point、Polygon、Circle 的绘制、修改、序列化和空间查询；
- 多图层显隐、场景编排和统一销毁；
- 基于时间戳插值的轨迹动画；
- GeoJSON 的导入、校验、冲突处理和导出。

## 2. 地图和业务数据来自哪里

### 2.1 在线底图：OpenStreetMap

基础地图使用 OpenLayers 提供的 `OSM` Source。它是项目中唯一依赖外部网络的数据源；离线或无法访问瓦片服务时，业务图层仍可创建，但底图瓦片可能无法显示。

实现文件：`src/map/layers/create-base-layer.ts`

```ts
export function createBaseLayer() {
  return new TileLayer({
    properties: { layerId: 'base' },
    className: 'gis-dark-base-layer',
    source: new OSM({ crossOrigin: 'anonymous' }),
    zIndex: 0,
  })
}
```

项目没有把底图图片打包到仓库，也没有自建瓦片服务。`className` 只用于宿主页面调整当前 GIS 底图的显示效果，不会修改 OSM 数据本身。

### 2.2 巡检事件：前端固定种子 Mock

巡检事件不是从后端 API 获取，而是由 `src/mock/generate-events.ts` 在浏览器中生成。界面可以切换 1k、10k、50k 和 100k 数据量。

数据以中国上海市中心附近的 WGS84 坐标 `[121.4737, 31.2304]` 为基准，模拟分布在黄浦区、静安区、徐汇区、虹口区和浦东新区。行政区名称用于生成演示地址，不代表真实行政边界或真实事件。

生成器使用固定参数的线性同余算法，同一个 `count` 每次都会生成相同的数据，便于复现性能数据和交互问题：

```ts
function createSeededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

export function generateInspectionEvents(count: number): InspectionEvent[] {
  const normalizedCount = Math.max(0, Math.floor(count))
  const random = createSeededRandom(20261008 + normalizedCount)
  const baseTime = Date.parse('2026-10-08T08:00:00+08:00')

  return Array.from({ length: normalizedCount }, (_, index) => ({
    id: `EVT-${String(index + 1).padStart(6, '0')}`,
    type: TYPES[index % TYPES.length]!,
    status: STATUSES[Math.floor(random() * STATUSES.length)]!,
    level: LEVELS[Math.floor(random() * LEVELS.length)]!,
    lng: 121.4737 + Math.cos(angle) * radius + (districtIndex - 2) * 0.007,
    lat: 31.2304 + Math.sin(angle) * radius + ((districtIndex % 2) - 0.5) * 0.008,
    address: `${DISTRICTS[districtIndex]}巡检网格 ${String((index % 240) + 1).padStart(3, '0')} 号`,
    createdAt: new Date(baseTime + index * 30_000).toISOString(),
  }))
}
```

事件时间从固定基准时刻开始，每条递增 30 秒；类型按固定顺序循环，状态和等级由固定随机序列产生。该随机算法只服务于可复现演示，不用于安全或统计采样。

### 2.3 预设巡检区域：本地固定数据

`src/mock/regions.ts` 提供两个本地预设区域：

- 黄浦核心巡检区：Polygon；
- 东部重点巡检圈：Circle，半径 1,200 米。

区域只保存可序列化的业务几何，不保存 OpenLayers `Feature` 或 `Geometry`。页面载入区域时再转换为地图几何。

### 2.4 责任网格：前端按范围计算

责任网格不是外部行政区划数据。`create-responsibility-grid-layer.ts` 使用固定 WGS84 范围：

```ts
const GRID_COLUMNS = 4
const GRID_ROWS = 3
const GRID_WGS84_EXTENT = [121.425, 31.19, 121.525, 31.27] as const
```

代码将范围等分为 4 列、3 行，共 12 个 Polygon Feature。每个网格具有业务 ID、蛇形巡检顺序、覆盖状态和交替色调。

### 2.5 巡检轨迹：本地固定时间序列

`src/mock/tracks.ts` 提供 12 个 WGS84 轨迹点，依次经过 4×3 责任网格的中心点。轨迹按从南到北的蛇形顺序排列，相邻点时间间隔 30 秒，完整演示时间约 5 分 30 秒。

这不是 GPS 设备上传的真实轨迹，而是用于验证时间插值、倍速播放、网格覆盖和路线复盘的确定性数据。

### 2.6 用户在当前会话产生的数据

以下数据由用户操作产生，仅存在于当前浏览器页面生命周期中：

- 地图选点后创建的新事件；
- 编辑后的事件类型、等级、地址和坐标；
- 责任人分派和转派结果；
- 状态推进和操作时间线；
- 用户绘制并保存的 Polygon/Circle 区域；
- GeoJSON 文件导入的事件；
- 每个事件最多 3 张现场图片及其 Blob URL。

当前没有后端 API、数据库或 `localStorage` 持久化。刷新页面会重新建立演示数据。

## 3. 核心业务数据协议

### 3.1 巡检事件

实现文件：`src/types/inspection-event.ts`

```ts
export interface InspectionEvent {
  id: string
  type: 'ROAD_DAMAGE' | 'LIGHT_FAILURE' | 'GARBAGE' | 'MANHOLE'
  status: 'PENDING' | 'PROCESSING' | 'DONE'
  level: 'HIGH' | 'MEDIUM' | 'LOW'
  lng: number
  lat: number
  address: string
  createdAt: string
}
```

- `lng`、`lat` 使用 WGS84，单位为度；
- 状态只能按“待处理 → 处理中 → 已完成”单向推进；
- 等级同时参与排序、SLA 和热力权重；
- `createdAt` 使用 ISO 8601，用于时间展示和 SLA 推导。

### 3.2 巡检区域

`RegionGeometry` 支持 Polygon 和 Circle：

- Polygon 的每个坐标都按 `[经度, 纬度]` 排列，环首尾闭合；
- Circle 保存 WGS84 圆心和地表米制半径；
- `eventIds: null` 表示尚未计算，空数组表示已经计算但区域内没有事件。

### 3.3 轨迹点

```ts
export interface TrackPoint {
  lng: number
  lat: number
  timestamp: number
}
```

轨迹点必须按 Unix 毫秒时间戳升序排列。回放控制器以时间差而不是数组下标决定位置，因此不同采样间隔也能保持正确速度。

## 4. 坐标系如何处理

业务层、GeoJSON 和持久化区域统一使用 WGS84。OpenLayers 默认视图使用 Web Mercator，因此坐标只在进入或离开地图边界时转换。

事件转 Feature：

```ts
export function createEventFeature(event: InspectionEvent): EventFeature {
  const feature = new Feature<Point>({
    geometry: new Point(fromLonLat([event.lng, event.lat])),
  })
  feature.setId(event.id)
  feature.setProperties(getEventFeatureProperties(event))
  return feature
}
```

地图选点、鼠标位置和区域序列化则使用 `toLonLat` 转回 WGS84。这种边界转换有三个好处：

- API、GeoJSON 和数据库可以使用通用经纬度协议；
- OpenLayers 内部继续使用适合地图显示的投影坐标；
- Vue 和 Pinia 不需要了解投影后的米制坐标。

Circle 的半径需要额外处理 Web Mercator 局部缩放。序列化时乘 `cos(latitude)` 得到近似地表米数，恢复地图几何时再除以该比例。

## 5. 项目架构

```text
GisManagementDemo.vue
├── useGisStore：可序列化业务状态
├── MapManager：Vue 与 OpenLayers 的业务门面
│   ├── OpenLayers Map / View / Overlay / ScaleLine
│   ├── LayerManager：图层注册、显隐和销毁
│   ├── SpatialInteractionManager：Select、Draw、Modify
│   └── TrackPlaybackController：时间推进和轨迹插值
├── mock：事件、区域和轨迹演示数据
├── services：GeoJSON 与轨迹服务
├── map/layers：各独立图层工厂
└── map/styles：状态、选中和聚合样式缓存
```

### 5.1 Vue 页面层

`GisManagementDemo.vue` 负责页面布局和业务编排，包括筛选表单、分页、统计、事件表单、详情面板、场景切换、文件输入及图层控制。它不直接管理 OpenLayers Map、Layer、Source、Interaction 的创建和销毁。

### 5.2 Pinia 业务状态层

Store 保存事件、筛选条件、当前事件 ID、责任人、操作记录、区域定义和区域结果。海量事件使用 `shallowRef`，更新时替换数组或目标对象，避免 Vue 为十万个只读 Mock 对象创建深层代理。

### 5.3 MapManager 地图门面

`MapManager` 是页面调用地图能力的唯一主要入口，提供：

- `mount`、`destroy`；
- `setEvents`、`addEvent`、`updateEvent`、`removeEvent`；
- `focusEvent`、`fitEvents`；
- `setRenderMode`、`showLayer`、`hideLayer`；
- `setInteractionMode`、事件位置选取；
- 区域显示、清除、重新计算和序列化；
- 轨迹播放、暂停、重置、倍速和跳转。

页面与地图只交换业务 ID、WGS84 坐标、事件数组和回调结果，不把 OpenLayers 对象泄漏到 Vue 状态中。

### 5.4 LayerManager

`LayerManager` 维护 `layerId → Layer` 的唯一映射。重复 ID 会被拒绝，显隐和删除都通过稳定 ID 完成；销毁时统一从 Map 移除全部 Layer。

### 5.5 SpatialInteractionManager

它集中持有 Select、Draw、Modify 和相关监听器。切换模式时先停用全部 Interaction，再只激活目标模式，避免地图点击、绘制和拖拽同时竞争事件。

## 6. 图层及其实现

| 图层 | 数据来源 | 实现作用 |
| --- | --- | --- |
| `base` | 在线 OSM 瓦片 | 提供道路、建筑和地理背景 |
| `event` | 事件 VectorSource | 逐点显示事件并支持精确选择 |
| `cluster` | Event Source 的 Cluster 包装 | 低 Zoom 聚合海量邻近点 |
| `heatmap` | 与事件图层共享 Source | 表达事件等级和未闭环风险密度 |
| `responsibilityGrid` | 前端生成 4×3 Polygon | 表达责任范围和巡检覆盖进度 |
| `region` | Draw/Modify 产生的 Geometry | 展示当前空间筛选区域 |
| `track` | 固定轨迹时间序列 | 展示完整路线、已巡路线、节点和人员位置 |
| `selection` | 复用单个 Point Feature | 独立显示当前选中事件光圈 |
| `eventDraft` | 新建/编辑表单坐标 | 显示临时选点并提供脉冲提示 |

### 6.1 普通点位和状态颜色

事件 Feature 只保存用于渲染和识别的 `eventId`、`eventType`、`status`、`level`。样式按状态缓存：待处理红色、处理中橙色、已完成绿色。等级不再重复占用点位颜色，而是保留给文字、排序、SLA 和热力权重。

### 6.2 Cluster 聚合

ClusterSource 直接包装事件 Source，不复制十万条 Feature：

```ts
const source = new ClusterSource({
  distance: 42,
  minDistance: 18,
  source: eventSource,
})
```

只有一个事件的 Cluster 使用原事件样式，多个事件显示数量气泡。聚合样式按数量缓存，缓存达到 2,048 项时清空，避免长时间缩放造成无限增长。

### 6.3 热力图

热力图同样复用事件 Source，不维护第二套业务数据。高、中、低等级基础权重分别为 `1`、`0.68`、`0.38`；已完成事件权重降为 `0.12`，让热区更偏向高等级且未闭环的任务。

### 6.4 责任网格

12 个网格采用深色外描边和交替填充，提高复杂底图上的辨识度。回放时通过 `gridSequence` 将状态更新为：

- `pending`：尚未巡检；
- `current`：人员当前所在网格；
- `visited`：已经巡检。

图层只负责空间表达，不参与用户自定义区域筛选。

### 6.5 选中层和草稿层

SelectionLayer 始终复用一个 Feature，只改变 Geometry，因此在普通点和 Cluster 之间切换时仍能保持一致的青色高亮。EventDraftLayer 用于新建或编辑位置；选点期间可播放脉冲动画，并尊重系统的 `prefers-reduced-motion` 设置。

## 7. 事件浏览、筛选和统计

### 7.1 多条件筛选

Store 的 `filteredEvents` 依次检查类型、状态、等级和关键词。关键词匹配事件 ID 或地址。页面再叠加：

- SLA“全部/已超时”；
- 责任人或未分派条件；
- Polygon/Circle 区域内的 `eventIds`。

最终 `scopedEvents` 同时驱动地图、列表、导出、范围定位和统计，避免不同模块各自维护一份结果。

### 7.2 排序和分页

列表支持上报时间、事件等级和处置状态排序。地图仍保留完整筛选结果，Vue 列表只对排序后的结果切片，每页最多 100 行。页面支持首页、末页、前后页和目标页输入，输入值会被限制在有效页码范围。

### 7.3 地图与列表双向联动

地图点击流程：

```text
Select Feature → 提取 eventId → MapManager 回调
→ Store.selectedEventId → 详情面板更新
→ 自动计算事件所在列表页并滚动到高亮行
```

列表点击流程：

```text
列表 eventId → Store 选择事件 → MapManager.focusEvent
→ View.animate → SelectionLayer 更新 → Popup 定位
```

地图边界不返回 Feature 给 Vue，只返回业务 ID，避免上层依赖 OpenLayers 类型。

### 7.4 运营统计

项目根据当前作用域实时计算：

- 待处理、处理中、已完成数量；
- 今日新增、完成率和在线人员数；
- 事件类型排行；
- 紧急等级构成；
- SLA 健康度和超时数量；
- 每位巡检人员的任务负载。

类型和等级统计项可反向写入筛选条件，实现“统计即入口”。顶部待处置、处理中、已超时和已完成卡片也能快速联动地图和任务列表。

## 8. 事件创建、编辑、删除和处置

### 8.1 地图选点创建和编辑

表单可请求 `MapManager.startEventLocationPick`。地图下一次有效点击会转换为 WGS84 坐标，写入表单，并在 EventDraftLayer 显示临时位置。保存后：

- 新建调用 Store `addEvent` 和 MapManager `addEvent`；
- 编辑调用 Store `updateEvent` 和 MapManager `updateEvent`；
- 若事件仍符合当前筛选条件，则保持选中并定位；
- 若不再符合条件，则从当前列表和地图作用域退出。

删除需要二次确认，并同步清理选中状态、区域结果、操作记录、责任人和现场图片 Blob URL。

### 8.2 分派、转派和责任人筛选

责任人列表是页面内固定演示人员。Store 只为实际发生分派的事件保存 `eventId → assignee`，避免给十万条 Mock 数据预建重复字段。分派或转派成功后会追加 `ASSIGNED` 操作记录；任务调度场景可按人员或未分派任务筛选。

### 8.3 状态机和处置门禁

状态转换表只允许：

```text
PENDING → PROCESSING → DONE
```

业务门禁：

- 待处理事件必须先分派责任人，才能开始处理；
- 处理中事件至少添加 1 张现场图片，才能完成处置；
- 已完成事件不能再次推进。

区域批量处理只更新指定 ID 中当前状态匹配的事件，一次遍历完成数组替换和操作日志写入，避免大量逐条响应式提交。

### 8.4 操作时间线

初始“事件已上报”记录由 `createdAt` 动态派生，不为所有 Mock 数据预存日志。只有编辑、分派和状态变化发生后，才为对应事件保存增量记录。

### 8.5 现场图片

每个事件在当前会话最多添加 3 张图片，单张不能超过 5 MiB，非图片文件会被拒绝。页面保存文件名、大小、类型和 `URL.createObjectURL` 生成的预览地址；移除图片、删除事件或组件卸载时调用 `URL.revokeObjectURL`，避免 Blob 长期占用内存。图片不会上传服务器，也不会进入 Pinia 持久化。

### 8.6 SLA

演示 SLA 按等级计算：高等级 2 小时、中等级 4 小时、低等级 8 小时。截止时间为 `createdAt + SLA 小时数`，演示时钟从当前数据集最新创建时间推导，因此同一数据集可以稳定复现剩余和超时结果。

## 9. Select、Draw、Modify 和空间查询

### 9.1 交互模式

项目支持：

- Select：选择事件；
- Point Draw：为事件表单选位置；
- Polygon Draw：创建多边形筛选范围；
- Circle Draw：创建圆形筛选范围；
- Modify：修改当前区域。

`setMode` 会先清空旧 Draw、停用 Select/Modify，再启用当前模式，保证同一时刻只有一种主交互。

### 9.2 两阶段空间查询

区域完成或修改后，先用几何外接矩形和 VectorSource 空间索引粗筛，再用 Geometry 精确判断点是否位于区域内：

```ts
private emitRegionSelection(geometry: Geometry): void {
  if (geometry.getType() === 'Point') {
    this.options.onRegionSelect?.(null)
    return
  }
  const eventIds: string[] = []
  this.options.eventSource.forEachFeatureInExtent(geometry.getExtent(), (feature) => {
    const coordinate = feature.getGeometry()?.getCoordinates()
    const id = feature.getId()
    if (coordinate && geometry.intersectsCoordinate(coordinate) && typeof id === 'string')
      eventIds.push(id)
  })
  this.options.onRegionSelect?.(eventIds)
}
```

粗筛避免对全部 Feature 做精确几何判断，精筛避免只依赖外接矩形而产生误选。Point 只表达单一位置，没有面积语义，因此不作为区域筛选条件。

### 9.3 区域保存和恢复

保存区域时将 OpenLayers Polygon/Circle 转为 `RegionGeometry`；重新打开时反序列化为地图 Geometry。区域支持保存、选择、定位、修改、删除和事件数量重算。事件集合改变后，已保存区域保留几何，但其 `eventIds` 回到 `null`，提示结果需要重新计算。

## 10. GeoJSON 导入和导出

### 10.1 导出

导出使用当前全部作用域结果，而不是当前 100 行分页。输出为标准 WGS84 `FeatureCollection<Point>`，属性包含事件 ID、类型、状态、等级、地址和创建时间，不包含任何 OpenLayers 运行时对象。

```ts
features: events.map(({ lng, lat, ...properties }) => ({
  type: 'Feature',
  id: properties.id,
  geometry: { type: 'Point', coordinates: [lng, lat] },
  properties,
}))
```

页面通过 Blob 创建下载链接，触发完成后立即撤销对象 URL。

### 10.2 导入

导入分两层处理：

1. 根对象不是 `FeatureCollection` 时直接抛出错误；
2. 单条 Feature 错误时跳过，并累计 `rejectedCount`。

导入文件上限为 50 MiB。单条校验包括：Feature/Point 结构、非空 ID、文件内 ID 唯一、事件枚举合法、地址和时间合法、经度 `[-180, 180]`、纬度 `[-90, 90]`。进入 Store 时再次检查与现有事件的 ID 冲突，不覆盖已有业务状态。导入成功后，地图自动定位本次新增且当前筛选可见的事件。

## 11. 场景模式和图层编排

界面包含三个场景：

- 实时态势：以事件点、热力分析和运营统计为主；
- 任务调度：以事件队列、责任人和责任网格为主；
- 巡检复盘：显示轨迹、网格覆盖、节点和回放控制。

场景切换只调整现有图层显隐和业务筛选，不重复创建 Map。用户仍可通过图层控制器单独控制底图、事件、热力、网格、区域、轨迹和选中效果。

## 12. 轨迹回放如何实现

### 12.1 地图对象

TrackLayer 一次创建并持续复用：

- 完整未巡 `LineString`；
- 已巡 `LineString`；
- 人员位置 Point；
- 12 个节点 Point。

未巡路线使用紫色虚线；已巡路线使用深色外描边和实线紫色；节点根据 pending/current/visited 更新样式；起终点带明确标签。

### 12.2 时间插值

`TrackPlaybackController` 使用 `requestAnimationFrame` 推进真实经过时间，再乘 1x、2x 或 8x 倍率。每一帧定位目标时间所在的两个采样点，并在线段间插值：

```ts
const ratio = Math.min(
  1,
  Math.max(0, (targetTimestamp - start.timestamp) / (end.timestamp - start.timestamp)),
)
const coordinate: [number, number] = [
  start.coordinate[0] + (end.coordinate[0] - start.coordinate[0]) * ratio,
  start.coordinate[1] + (end.coordinate[1] - start.coordinate[1]) * ratio,
]
```

播放过程中不创建新 Feature，只更新人员 Point 和已巡 LineString 的坐标。暂停会结算精确时间；重置回到起点；拖动百分比时间轴会重新计算位置；播放中拖动后继续播放；点击 12 个节点可直接跳转到对应时间。

### 12.3 复盘统计

页面根据时间轴同步计算当前网格、已覆盖网格数、已用时间和完成度。路线里程使用 WGS84 Haversine 公式计算，总里程来自全部相邻点，已巡里程包含完整线段和当前线段的插值比例。进入巡检复盘时调用 `fitTrack`，确保路线和 12 个责任网格进入视口。

## 13. 10 万点性能方案

### 13.1 避免深层响应式

事件集合使用 `shallowRef`。事件修改时替换目标对象和数组，既能通知 Vue，又不会为每个对象建立深层 Proxy。

### 13.2 批量转换和写入

`MapManager.setEvents` 先批量生成 Feature，再一次清空 Source、一次 `addFeatures`。项目分别记录：

- 前端 Mock 数据生成耗时；
- 业务对象转 Feature 耗时；
- Source 批量更新耗时；
- 更新开始到 `rendercomplete` 的延迟。

这些都是实际测量值，不使用一次主线程耗时推算 FPS。

### 13.3 Cluster 和共享 Source

低 Zoom 使用 Cluster 减少当前帧实际绘制和命中的图形数量。普通点、Cluster 和 Heatmap 共享同一个事件 Source，因此切换模式或分析图层不会维护多份十万 Feature。

### 13.4 Style 缓存

事件样式按三个状态缓存；Cluster 样式按聚合数量缓存；轨迹节点样式按状态和标签缓存。高频 style 回调不会每帧创建大量 `Style`、`Fill`、`Stroke` 和 `Text`。

### 13.5 控制 DOM 数量

地图点由 OpenLayers Canvas 渲染，不为每个点创建 Vue DOM。列表分页固定 100 行，因此十万点数据不会同时产生十万行 DOM。

### 13.6 复用 Feature 和节制更新

- 选中效果复用单个 Feature；
- 事件编辑就地更新既有 Feature；
- 轨迹动画复用人员和已巡路线 Feature；
- 鼠标经纬度通知限制为约 12 Hz，减少高频 Vue 渲染；
- 操作记录和责任人只为发生业务变化的事件保存。

当前版本没有引入 Web Worker、服务端聚合、矢量瓦片或 WebGL Layer，因为本项目首先展示 OpenLayers Canvas、Cluster、批量更新和状态边界。生产数据规模或性能指标超出预算时，再根据测量结果引入这些能力。

## 14. 状态同步

### 14.1 Vue 到地图

```text
筛选/区域/责任人/SLA 条件变化
→ 计算 scopedEvents
→ MapManager.setEvents
→ 批量转换 Feature 并更新 Event Source
→ Event、Cluster、Heatmap 自动使用最新数据
```

单事件新建、编辑和删除优先调用增量方法，避免每次都重建全部 Feature。

### 14.2 地图到 Vue

```text
地图 Select/Draw/Modify/Pointer/Track Frame
→ MapManager 或 Interaction 回调
→ eventId、WGS84 坐标、eventIds、时间戳
→ Vue/Pinia 更新列表、详情、区域结果或复盘摘要
```

Pinia 不保存 Map、Layer、Source、Feature、Geometry、Interaction 或 Overlay，因为这些对象包含复杂原型、内部缓存和循环引用，不适合序列化，也不应该被 Vue 深层代理。

## 15. 生命周期和资源释放

组件挂载时只创建一次 `MapManager`。卸载时依次：

- 停止事件选点脉冲和位置监听；
- 销毁 Select、Draw、Modify；
- 解绑 OpenLayers 事件监听器；
- 取消轨迹 `requestAnimationFrame`；
- 清理 Popup Overlay；
- 从 Map 移除全部 Layer；
- 清空 Source 并解除 ClusterSource 引用；
- 解除 Map target；
- 撤销全部现场图片 Blob URL。

`destroy` 具备幂等保护，重复调用不会重复释放同一资源。

## 16. Package 目录和公共 API

```text
packages/openlayers-gis-demo/
├── src/components/GisManagementDemo.vue       # 完整工作台和业务编排
├── src/map/MapManager.ts                       # 地图业务门面
├── src/map/LayerManager.ts                     # 图层生命周期
├── src/map/interactions/                       # Select/Draw/Modify
├── src/map/layers/                             # 九类地图图层
├── src/map/sources/                            # Event → Feature
├── src/map/styles/                             # 状态与缓存样式
├── src/mock/                                   # 事件、区域、轨迹数据
├── src/services/TrackPlaybackController.ts     # 轨迹时间插值
├── src/services/export-events.ts               # GeoJSON 交换
├── src/stores/gis.ts                           # Pinia 业务状态
├── src/types/                                  # 业务协议
├── src/index.ts                                # 唯一公共入口
├── README.md                                   # 项目概览
└── DEVELOPMENT.md                              # 本开发说明
```

`src/index.ts` 对外提供完整组件、MapManager、LayerManager、Store、Mock 生成器、预设区域、GeoJSON 服务以及必要类型。宿主应用应从公共入口使用 Package，不应直接依赖内部 Layer 或 Service 文件。

## 17. 如何替换为真实生产数据

### 17.1 事件 API

将 `generateInspectionEvents` 替换为后端查询结果，并在 API 适配层转换成 `InspectionEvent[]`。地图层不需要改变，因为它只依赖公共业务协议。

大量生产数据不应一次返回全部事件。可根据视口 extent、Zoom、时间和筛选条件请求服务端数据，并考虑服务端聚合、矢量瓦片或 WebGL 渲染。

### 17.2 区域和任务持久化

将 `RegionGeometry`、事件分派、状态操作和活动记录提交到后端。继续使用 WGS84 作为接口边界，避免把 OpenLayers Geometry 序列化格式暴露给服务端。

### 17.3 真实轨迹

后端只需返回按时间戳升序排列的 `TrackPoint[]`。当前回放控制器可以继续使用；若轨迹非常长，应进行抽稀、分段加载或按视口/时间窗请求。

### 17.4 底图替换

可以在 `create-base-layer.ts` 替换为其他 XYZ、WMTS 或企业地图服务。若采用受限服务，需要补充 Token 管理、来源标注、坐标系适配、缓存和失败降级。

## 18. 当前限制

- 业务事件、责任人、操作日志、区域和图片不持久化；
- OSM 底图显示依赖网络；
- 行政区名称、责任网格、事件和轨迹均为演示数据；
- 现场图片只生成本地预览，不上传服务器；
- 前端十万点用于工程演示，不等于生产系统应一次下载十万条记录；
- SLA 使用固定演示规则，没有节假日、工作时段或服务端时钟；
- 空间查询以点和单个当前区域为主，没有空间数据库、拓扑修复或复杂空间分析；
- 页面交互和性能体验需要在真实浏览器中由用户手动验证。
