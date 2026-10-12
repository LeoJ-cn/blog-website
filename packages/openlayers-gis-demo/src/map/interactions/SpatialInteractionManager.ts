import type OlMap from 'ol/Map.js' // OpenLayers 地图实例类型，用于挂载和移除空间交互。
import type Feature from 'ol/Feature.js' // OpenLayers 要素类型，用于读取交互命中的业务对象。
import { boundingExtent } from 'ol/extent.js' // 根据一组投影坐标计算可用于视图定位的最小包围范围。
import type Geometry from 'ol/geom/Geometry.js' // OpenLayers 几何基类，用于统一处理绘制和修改结果。
import Draw from 'ol/interaction/Draw.js' // OpenLayers 绘制交互，在矢量数据源上创建区域几何。
import Modify from 'ol/interaction/Modify.js' // OpenLayers 修改交互，允许拖动顶点编辑已有区域。
import Select from 'ol/interaction/Select.js' // OpenLayers 选择交互，根据指针事件命中指定业务图层。
import type VectorLayer from 'ol/layer/Vector.js' // OpenLayers 矢量图层类型，用于限制选择交互的目标图层。
import type VectorSource from 'ol/source/Vector.js' // OpenLayers 矢量数据源类型，保存事件与区域要素。
import { unByKey } from 'ol/Observable.js' // 按事件句柄解绑 OpenLayers 监听，避免重复响应和泄漏。
import type { EventsKey } from 'ol/events.js' // OpenLayers 事件订阅句柄类型，用于集中管理监听生命周期。
import type { createClusterLayer } from '../layers/create-cluster-layer'
import type { EventFeature } from '../sources/create-event-source'

export type MapMode =
  | 'select' // 选择事件点位并驱动业务详情。
  | 'draw' // 创建新的空间范围；每次开始绘制会替换旧范围。
  | 'modify' // 修改已绘制范围，并在结束时重新执行空间筛选。
export type DrawGeometryType =
  | 'Point' // 仅演示点标绘，不执行区域包含查询。
  | 'Polygon' // 使用多边形包含关系框选事件。
  | 'Circle' // 使用圆形范围框选事件。

interface Options {
  /** Interaction 所属地图；销毁管理器时会从该地图移除全部 Interaction。 */
  map: OlMap
  /** 普通事件图层；命中后直接返回业务事件 ID。 */
  eventLayer: VectorLayer<VectorSource<EventFeature>>
  /** 聚合事件图层；单事件聚合返回 ID，多事件聚合缩放到其空间范围。 */
  clusterLayer: ReturnType<typeof createClusterLayer>['layer']
  /** 空间筛选的数据源，包含完整事件点集合。 */
  eventSource: VectorSource<EventFeature>
  /** Draw 与 Modify 共享的区域数据源，同一时间只保留一个绘制结果。 */
  regionSource: VectorSource<Feature<Geometry>>
  /** Select 变化时返回事件 ID；null 表示取消选择或未命中事件。 */
  onEventSelect?: (eventId: string | null) => void
  /** 区域计算完成时返回结果；null 表示当前几何不具备区域筛选语义。 */
  onRegionSelect?: (eventIds: string[] | null) => void
}

/** 统一编排 Select、Draw、Modify 的互斥激活、空间筛选和监听生命周期。 */
export class SpatialInteractionManager {
  private readonly select: Select
  private readonly modify: Modify
  private draw: Draw | null = null
  private readonly listenerKeys: EventsKey[] = []
  private drawListenerKeys: EventsKey[] = []

  constructor(private readonly options: Options) {
    // 允许点击图标边缘附近的像素，兼顾鼠标和触控设备上的实际点击误差。
    this.select = new Select({
      // layers 限制可命中的图层；hitTolerance 是命中点周围额外容错半径，单位为屏幕像素。
      layers: [options.eventLayer, options.clusterLayer],
      hitTolerance: 8,
      // 视觉高亮由独立 SelectionLayer 负责，Select 仅处理命中和选择事件。
      style: null,
    })
    // Modify.source 指定允许编辑的区域数据源；setActive(false) 创建后先禁用交互响应。
    this.modify = new Modify({ source: options.regionSource })
    this.modify.setActive(false)
    // Map.addInteraction 将交互加入事件处理链，后加入的交互优先处理浏览器事件。
    options.map.addInteraction(this.select)
    options.map.addInteraction(this.modify)

    this.listenerKeys.push(
      // Interaction.on(eventType, listener) 注册监听并返回 EventsKey，供销毁时精确解绑。
      this.select.on('select', (event) => {
        // SelectEvent.selected 是本次新选中的 Feature 数组；get 读取聚合 Source 写入的成员数组。
        const selectedFeature = event.selected[0]
        const clusterFeatures = selectedFeature?.get('features') as EventFeature[] | undefined
        if (clusterFeatures?.length === 1) {
          const id = clusterFeatures[0]?.getId()
          options.onEventSelect?.(typeof id === 'string' ? id : null)
          return
        }
        if (clusterFeatures && clusterFeatures.length > 1) {
          // 多点聚合没有唯一业务事件：缩放到成员范围，让用户继续下钻选择具体点位。
          const coordinates = clusterFeatures.flatMap((feature) => {
            // getGeometry 获取 Point，getCoordinates 返回其 [x, y] 投影坐标。
            const coordinate = feature.getGeometry()?.getCoordinates()
            return coordinate ? [coordinate] : []
          })
          if (coordinates.length > 0) {
            // getView().fit(extent, options) 调整中心与分辨率以容纳范围；boundingExtent 计算最小包围盒。
            options.map.getView().fit(boundingExtent(coordinates), {
              // duration 单位为毫秒；maxZoom 限制最大下钻级别；padding 顺序为 [上, 右, 下, 左] 像素。
              duration: 350,
              maxZoom: 18,
              padding: [48, 48, 48, 48],
            })
          }
          options.onEventSelect?.(null)
          return
        }
        // getId() 读取 Feature 稳定业务主键；未命中时 selectedFeature 为 undefined。
        const id = selectedFeature?.getId()
        options.onEventSelect?.(typeof id === 'string' ? id : null)
      }),
      this.modify.on('modifyend', (event) => {
        // event.features 是被修改要素集合；item(0) 读取第一个区域 Feature。
        const geometry = event.features.item(0)?.getGeometry()
        if (geometry) this.emitRegionSelection(geometry)
      }),
    )
  }

  setMode(mode: MapMode, drawType: DrawGeometryType = 'Polygon'): void {
    // 任一时刻只允许一类主动交互，避免拖拽时 Draw、Modify 和 Select 同时响应。
    this.removeDraw()
    // setActive(boolean) 开关交互事件处理，不会从 Map 移除实例或清空已选 Feature。
    this.select.setActive(mode === 'select')
    this.modify.setActive(mode === 'modify')
    if (mode !== 'draw') return

    // Draw.source 接收绘制完成的 Feature；type 指定 Point、Polygon 或 Circle 几何类型。
    this.draw = new Draw({ source: this.options.regionSource, type: drawType })
    this.drawListenerKeys = [
      // drawstart 时 clear() 移除旧区域，保证 Source 同一时间只保存一个绘制结果。
      this.draw.on('drawstart', () => this.options.regionSource.clear()),
      this.draw.on('drawend', (event) => {
        // DrawEvent.feature 是本次新建 Feature；getGeometry 取得用于空间筛选的几何。
        const geometry = event.feature.getGeometry()
        if (geometry) this.emitRegionSelection(geometry)
      }),
    ]
    // 动态 Draw 仅在 draw 模式挂载，离开模式后由 removeInteraction 移除。
    this.options.map.addInteraction(this.draw)
  }

  setSelectActive(active: boolean): void {
    this.select.setActive(active)
  }

  /** 暂停全部主动交互，供事件地图选点等一次性点击流程独占下一次点击。 */
  setAllInactive(): void {
    this.removeDraw()
    this.select.setActive(false)
    this.modify.setActive(false)
  }

  /** 对程序载入的区域复用与 Draw/Modify 相同的空间筛选流程。 */
  evaluateRegion(geometry: Geometry): void {
    this.emitRegionSelection(geometry)
  }

  private emitRegionSelection(geometry: Geometry): void {
    // Point 没有面积语义，不将“坐标完全相等”误报为区域框选结果。
    // getType() 返回稳定几何类型名，例如 Point、Polygon 或 Circle。
    if (geometry.getType() === 'Point') {
      this.options.onRegionSelect?.(null)
      return
    }
    const eventIds: string[] = []
    // 先利用 VectorSource 空间索引做外接矩形粗筛，再逐点做几何包含判断。
    // geometry.getExtent() 返回 [minX, minY, maxX, maxY]；回调只接收与范围相交的候选 Feature。
    this.options.eventSource.forEachFeatureInExtent(geometry.getExtent(), (feature) => {
      // intersectsCoordinate([x, y]) 执行精确包含判断；getId() 读取业务主键。
      const coordinate = feature.getGeometry()?.getCoordinates()
      const id = feature.getId()
      if (coordinate && geometry.intersectsCoordinate(coordinate) && typeof id === 'string')
        eventIds.push(id)
    })
    this.options.onRegionSelect?.(eventIds)
  }

  private removeDraw(): void {
    if (!this.draw) return
    // Draw 是按几何类型动态创建的；切换模式时必须同时解绑监听，避免旧 Interaction 被数组引用。
    unByKey(this.drawListenerKeys)
    this.drawListenerKeys = []
    // removeInteraction 解除 Map 事件链持有；参数必须是此前加入的同一 Draw 实例。
    this.options.map.removeInteraction(this.draw)
    this.draw = null
  }

  destroy(): void {
    // OpenLayers Interaction 和监听器都由管理器统一释放，防止页面反复挂载后重复响应。
    this.removeDraw()
    // removeInteraction 分别解除静态 Select/Modify；unByKey 接收句柄数组批量解绑监听。
    this.options.map.removeInteraction(this.select)
    this.options.map.removeInteraction(this.modify)
    unByKey(this.listenerKeys)
  }
}
