# GIS 空间分析工作台设计

## 1. 背景

`@blog/openlayers-gis-demo` 已具备事件视口查询、Cluster、区域绘制、轨迹回放、业务处置和 IndexedDB 持久化，但空间能力仍以“地图展示 + 业务 CRUD”为主。下一阶段需要把项目升级为可以解释、执行和保存空间分析任务的 Developer Playground，并为后续时空回放、智能调度、百万级渲染、图层系统、地理围栏和离线同步提供稳定基础。

全部 GIS 扩展分为七个独立阶段：

1. 空间分析工作台；
2. 时空回放与事件演化；
3. 智能调度模拟；
4. 十万到百万级渲染演进；
5. 图层与坐标系统能力；
6. 区域告警与地理围栏；
7. 离线地图与同步冲突。

各阶段分别设计、实施和验收。本设计只详细定义第一阶段，不提前实现后续阶段。

## 2. 第一阶段目标

空间分析工作台需要支持：

- WGS84 距离测量和 Polygon 面积测量；
- 事件点缓冲区分析；
- 最近事件查询；
- Polygon/Circle 对事件的包含分析；
- 两个分析区域之间的相交与差异统计；
- 多区域事件数量、状态、等级和风险评分对比；
- 独立分析结果图层；
- 分析任务和结果按当前数据量级持久化；
- 分析结果 GeoJSON 导入与导出。

成功标准：用户可以从地图创建分析对象、执行分析、核对统计结果、保存分析会话，并在刷新页面或切换回同一数据量级后恢复。完整事件数据继续只存在于 `LocalGisApi` 的非响应式快照和空间索引中，不进入 Pinia 或 OpenLayers Source。

## 3. 非目标

第一阶段不实现：

- 时间轴、多车辆轨迹或历史快照；
- 自动派单、路线规划或调度优化；
- Web Worker、WebGL、矢量瓦片或百万级基准；
- WMS、KML、GPX、用户配置图层或投影选择器；
- 实时围栏告警；
- 服务端同步、冲突合并或离线瓦片；
- 新增、修改或生成测试代码；
- 页面自动化或浏览器代操作。

## 4. 用户界面

工作台主导航新增“空间分析”场景，与“实时态势、任务调度、巡检复盘”并列。

进入空间分析场景后：

```text
顶部：城市巡检运营工作台 / 数据量级 / 空间分析

左侧：分析工具
├── 测距
├── 测面积
├── 缓冲区
├── 最近事件
├── 区域统计
└── 区域对比

中间：地图与分析图层

右侧：参数、结果摘要、保存与导入导出
```

布局继续使用 Flexbox 和媒体查询，不使用 CSS Grid。分析场景复用现有地图容器、图层控制、状态栏和数据量级切换，不创建第二个 OpenLayers Map。

### 4.1 工具交互

- 测距：用户依次绘制至少两个 WGS84 坐标点；双击结束，结果显示总长度和各段长度。
- 测面积：用户绘制闭合 Polygon；结果显示面积和周长。
- 缓冲区：输入中心点或选择事件，并选择 100m、500m、1km 或自定义正数半径。
- 最近事件：输入目标点和返回数量，数量范围固定为 1～100。
- 区域统计：选择已有区域或绘制 Polygon/Circle，统计内部事件。
- 区域对比：选择两个已保存分析区域，对比各自独有事件和共同事件。

切换工具时结束当前未提交绘制，但保留已经保存的分析结果。清空当前结果只影响活动分析；删除已保存分析必须经过二次确认。

## 5. 架构

```text
GisManagementDemo.vue
        ↓
SpatialAnalysisController
├── SpatialAnalysisService
│   ├── measurement
│   ├── buffer
│   ├── nearest-neighbor
│   └── region-statistics
├── GisApi
│   ├── queryViewport（现有）
│   ├── queryAnalysisCandidates（新增）
│   └── analysis persistence（新增）
└── MapManager
    └── AnalysisLayerManager
```

### 5.1 `SpatialAnalysisService`

纯 TypeScript 业务服务，不依赖 Vue、Pinia、DOM 或 OpenLayers。输入和输出均使用 WGS84 可序列化协议。

职责：

- 校验分析参数；
- 计算 Haversine 距离、Polygon 面积与周长；
- 生成适用于城市尺度展示的缓冲区 Polygon；
- 从候选事件中计算最近邻；
- 计算区域包含、交集 ID 和差异 ID；
- 汇总状态、等级、类型和风险评分。

几何算法与地图表现解耦，后续 `HttpGisApi` 可以把重型分析迁移到 PostGIS，而页面协议保持不变。

### 5.2 `SpatialAnalysisController`

负责页面级分析状态机：

```text
idle → drawing → ready → running → success
                     ↘ error
```

- `idle`：没有活动分析；
- `drawing`：正在采集地图几何；
- `ready`：几何与参数有效，可以执行；
- `running`：禁止重复提交和切换数据量级；
- `success`：结果已生成，可以保存或导出；
- `error`：保留几何与参数，允许修正后重试。

Controller 使用递增 request ID，避免较早的异步分析覆盖最新结果。它不持有 OpenLayers Feature，只保存可序列化输入、结果和稳定业务 ID。

### 5.3 `AnalysisLayerManager`

作为 `MapManager` 的子能力，管理独立业务图层：

- `analysisInput`：当前绘制或选择的输入几何；
- `analysisResult`：缓冲区、区域边界和测量标注；
- `analysisHighlight`：最近事件、交集事件和差异事件的高亮。

分析结果不得修改现有事件 Feature 的业务样式。高亮图层仅保存当前分析命中的视口事件；完整命中 ID 保存在分析结果协议中。

## 6. 公共协议

```ts
export type SpatialAnalysisKind =
  | 'DISTANCE'
  | 'AREA'
  | 'BUFFER'
  | 'NEAREST_EVENTS'
  | 'REGION_STATISTICS'
  | 'REGION_COMPARISON'

export type AnalysisGeometry =
  | {
      type: 'Point'
      /** WGS84 坐标，顺序为 [经度, 纬度]，单位为度。 */
      coordinates: Wgs84Coordinate
    }
  | {
      type: 'LineString'
      /** 至少两个 WGS84 坐标，按绘制顺序排列。 */
      coordinates: readonly Wgs84Coordinate[]
    }
  | {
      type: 'Polygon'
      /** 环首尾闭合；外环在前，后续环为洞。 */
      rings: readonly (readonly Wgs84Coordinate[])[]
    }
  | {
      type: 'Circle'
      center: Wgs84Coordinate
      /** 地表半径，单位为米，必须大于 0。 */
      radiusMeters: number
    }
```

持久化分析记录：

```ts
export interface PersistedSpatialAnalysis {
  id: string
  name: string
  kind: SpatialAnalysisKind
  input: SpatialAnalysisInput
  result: SpatialAnalysisResult
  /** 分析执行时的数据量级。 */
  datasetScale: GisDatasetScale
  /** 分析执行时完整事件集合的版本号。 */
  datasetVersion: number
  /** ISO 8601 格式。 */
  createdAt: string
  /** ISO 8601 格式。 */
  updatedAt: string
}
```

结果中的距离统一使用米，面积统一使用平方米；展示层可以格式化为 km 或 km²。事件集合使用稳定 ID，不复制完整事件对象。

## 7. 空间算法

### 7.1 距离

两点距离使用 Haversine 公式，地球平均半径固定为 6,371,008.8 米。LineString 总长度为相邻点球面距离之和。结果明确是地表近似距离，不代表道路导航距离。

### 7.2 面积

Polygon 面积使用球面面积算法，支持外环与洞。输入环必须至少包含四个坐标且首尾相同。第一阶段不处理跨越 180° 经线的 Polygon；检测到后返回明确失败原因。

### 7.3 缓冲区

缓冲区按 WGS84 球面目标点公式采样为 Polygon。默认使用 64 个等角度采样点，首尾闭合。该结果适合城市尺度的展示和点包含判断，不承诺测绘级精度。

### 7.4 最近事件

`LocalGisApi` 根据目标点生成逐步扩大的查询范围，从现有空间索引读取候选事件，再用 Haversine 精确排序。距离相同时按事件 ID 码元顺序保持稳定结果。不得扫描 Pinia 当前视口数组来代替完整数据集查询。

### 7.5 区域统计与风险评分

区域统计至少返回：

- 事件总数；
- 待处理、处理中、已完成数量；
- HIGH、MEDIUM、LOW 数量；
- 各事件类型数量；
- 高风险事件 ID；
- 风险评分。

第一版权重固定为：

```text
状态：PENDING 3，PROCESSING 2，DONE 0
等级：HIGH 5，MEDIUM 3，LOW 1
超时：额外 +4
```

单事件风险分为状态分、等级分和超时分之和；区域风险评分为区域内单事件风险分总和。评分仅用于演示排序，不表达真实公共安全结论。

## 8. 数据访问与性能边界

空间分析不得把 100k 完整事件传给组件。`GisApi` 新增分析查询能力，由 `LocalGisApi` 在完整非响应式快照和空间索引上执行。

- 测距和面积只处理用户输入几何；
- 区域统计先通过空间索引进行 BBOX 粗筛，再做几何精筛；
- 最近事件通过索引扩大候选范围；
- 对比分析使用事件 ID Set 计算交集与差异；
- 返回页面的事件详情继续受视口与分页边界约束；
- 分析结果高亮超过 2,000 个事件时默认只显示边界和统计，用户可按视口查询高亮子集。

第一阶段不引入 Web Worker。若 100k 区域精筛在目标浏览器中形成明显长任务，记录为第四阶段的 Worker/百万级优化输入，不在本阶段临时引入另一套并发架构。

## 9. 持久化

沿用一个物理数据库 `blog-gis`。每个 `dataset:*` namespace 新增：

```text
analyses:index
analysis:<analysisId>
```

`analyses:index` 保存按 `updatedAt` 降序排列的轻量摘要，不包含完整命中事件 ID。单条分析记录保存输入、结果和数据版本。

保存、重命名和删除分析使用 `GisApi` 写穿语义：IndexedDB 成功后才更新页面状态。删除使用显式 `null` 墓碑，与现有事件辅助数据删除协议一致。

分析结果与当前数据量级隔离。切换量级后通过真实刷新恢复目标量级自己的分析记录。若记录的 `datasetVersion` 与当前数据版本不一致，记录仍可查看，但标记为“数据已变化”，必须重新执行后才能覆盖保存。

## 10. GeoJSON 导入与导出

导出使用 `FeatureCollection`：

- 输入几何或结果几何写入 `geometry`；
- 分析 ID、名称、类型、数据量级、时间、距离、面积和统计摘要写入 `properties`；
- 大型事件 ID 集合不写入单个 Feature properties，避免文件无限膨胀；可单独导出命中事件点集合。

导入只接受本模块定义的分析 GeoJSON。根协议错误直接失败；单 Feature 错误分类统计。导入记录生成新的本地分析 ID，避免静默覆盖同名记录。

## 11. 错误处理

- 非法坐标、未闭合 Polygon、非正半径和越界最近事件数量在执行前拒绝；
- 跨 180° 经线 Polygon 返回明确“不支持”原因；
- 分析运行失败保留输入几何和参数；
- 持久化失败不更新已保存列表；
- 数据量级切换或页面卸载时取消未完成请求，禁止旧结果提交；
- Memory 降级时分析仍可执行，但保存区域显示刷新丢失提示；
- 错误消息不得包含完整事件集合或附件 Blob。

## 12. 生命周期

页面初始化：

1. 恢复当前数据量级和完整事件索引；
2. 恢复分析摘要；
3. 创建 `SpatialAnalysisController`；
4. 注册分析图层；
5. 用户进入空间分析场景时再加载具体记录。

页面卸载或切换数据量级：

- 取消分析请求；
- 结束未提交绘制；
- 清空分析 Feature 和 Overlay；
- 释放 Controller；
- 再按现有顺序释放 GIS API 与 MapManager。

## 13. 验证策略

用户明确要求本阶段不编写测试代码，因此实施计划不得创建或修改测试文件、测试用例、测试夹具或临时测试脚本，也不得宣称使用 TDD。

允许的非页面验证需在执行前按仓库规则单独取得用户许可，范围包括：

- TypeScript 类型检查；
- ESLint；
- Vite 构建；
- `git diff --check`；
- CSS Grid 与依赖版本静态扫描。

页面行为由用户手动验证：工具切换、绘制、测量、缓冲区、最近事件、区域统计、区域对比、保存恢复、数据版本失效提示和 GeoJSON 导入导出。Webpack 保持关闭。

## 14. 后续阶段衔接

- 第二阶段复用 `SpatialAnalysisController` 的 request ID 和可序列化结果协议，为分析结果增加时间范围。
- 第三阶段复用距离、最近邻、区域风险和事件集合协议实现调度策略。
- 第四阶段针对本阶段记录的主线程长任务引入 Worker、WebGL 或矢量瓦片。
- 第五阶段把分析输入和结果接入可配置图层、坐标转换和外部图层源。
- 第六阶段复用区域包含、事件风险和可序列化 Polygon 实现围栏规则。
- 第七阶段为 `GisApi` 增加操作日志、同步状态和冲突解决；不改变空间算法协议。
