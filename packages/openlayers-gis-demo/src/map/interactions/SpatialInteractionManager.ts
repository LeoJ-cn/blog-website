import type OlMap from 'ol/Map.js'
import type Feature from 'ol/Feature.js'
import type Geometry from 'ol/geom/Geometry.js'
import Draw from 'ol/interaction/Draw.js'
import Modify from 'ol/interaction/Modify.js'
import Select from 'ol/interaction/Select.js'
import type VectorLayer from 'ol/layer/Vector.js'
import type VectorSource from 'ol/source/Vector.js'
import { unByKey } from 'ol/Observable.js'
import type { EventsKey } from 'ol/events.js'
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
  /** Select 只命中普通事件图层，避免把区域或聚合 Feature 当作业务事件。 */
  eventLayer: VectorLayer<VectorSource<EventFeature>>
  /** 空间筛选的数据源，包含完整事件点集合。 */
  eventSource: VectorSource<EventFeature>
  /** Draw 与 Modify 共享的区域数据源，同一时间只保留一个绘制结果。 */
  regionSource: VectorSource<Feature<Geometry>>
  /** Select 变化时返回事件 ID；null 表示取消选择或未命中事件。 */
  onEventSelect?: (eventId: string | null) => void
  /** 区域计算完成时返回结果；null 表示当前几何不具备区域筛选语义。 */
  onRegionSelect?: (eventIds: string[] | null) => void
}

export class SpatialInteractionManager {
  private readonly select: Select
  private readonly modify: Modify
  private draw: Draw | null = null
  private readonly listenerKeys: EventsKey[] = []
  private drawListenerKeys: EventsKey[] = []

  constructor(private readonly options: Options) {
    this.select = new Select({ layers: [options.eventLayer], hitTolerance: 5 })
    this.modify = new Modify({ source: options.regionSource })
    this.modify.setActive(false)
    options.map.addInteraction(this.select)
    options.map.addInteraction(this.modify)

    this.listenerKeys.push(
      this.select.on('select', (event) => {
        const id = event.selected[0]?.getId()
        options.onEventSelect?.(typeof id === 'string' ? id : null)
      }),
      this.modify.on('modifyend', (event) => {
        const geometry = event.features.item(0)?.getGeometry()
        if (geometry) this.emitRegionSelection(geometry)
      }),
    )
  }

  setMode(mode: MapMode, drawType: DrawGeometryType = 'Polygon'): void {
    // 任一时刻只允许一类主动交互，避免拖拽时 Draw、Modify 和 Select 同时响应。
    this.removeDraw()
    this.select.setActive(mode === 'select')
    this.modify.setActive(mode === 'modify')
    if (mode !== 'draw') return

    this.draw = new Draw({ source: this.options.regionSource, type: drawType })
    this.drawListenerKeys = [
      this.draw.on('drawstart', () => this.options.regionSource.clear()),
      this.draw.on('drawend', (event) => {
        const geometry = event.feature.getGeometry()
        if (geometry) this.emitRegionSelection(geometry)
      }),
    ]
    this.options.map.addInteraction(this.draw)
  }

  setSelectActive(active: boolean): void {
    this.select.setActive(active)
  }

  private emitRegionSelection(geometry: Geometry): void {
    // Point 没有面积语义，不将“坐标完全相等”误报为区域框选结果。
    if (geometry.getType() === 'Point') {
      this.options.onRegionSelect?.(null)
      return
    }
    const eventIds: string[] = []
    // 先利用 VectorSource 空间索引做外接矩形粗筛，再逐点做几何包含判断。
    this.options.eventSource.forEachFeatureInExtent(geometry.getExtent(), (feature) => {
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
    this.options.map.removeInteraction(this.draw)
    this.draw = null
  }

  destroy(): void {
    // OpenLayers Interaction 和监听器都由管理器统一释放，防止页面反复挂载后重复响应。
    this.removeDraw()
    this.options.map.removeInteraction(this.select)
    this.options.map.removeInteraction(this.modify)
    unByKey(this.listenerKeys)
  }
}
