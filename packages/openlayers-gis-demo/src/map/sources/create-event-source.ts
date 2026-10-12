import Feature from 'ol/Feature.js' // OpenLayers 要素容器，组合几何与业务属性供图层渲染和命中。
import Point from 'ol/geom/Point.js' // OpenLayers 点几何，用投影坐标表示事件位置。
import { fromLonLat } from 'ol/proj.js' // 将 WGS84 经纬度转换为地图视图使用的投影坐标。
import VectorSource from 'ol/source/Vector.js' // OpenLayers 矢量数据源，负责保存、索引和查询事件要素。
import type { InspectionEvent } from '../../types/inspection-event'
import type { EventFeatureProperties } from '../types/event-feature'

/** 事件在 OpenLayers 中的运行时表示；业务真值仍由 InspectionEvent 维护。 */
export type EventFeature = Feature<Point>

/** 提取地图渲染与交互所需的最小属性集合。 */
export function getEventFeatureProperties(event: InspectionEvent): EventFeatureProperties {
  return {
    eventId: event.id,
    eventType: event.type,
    status: event.status,
    level: event.level,
  }
}

/** 把 WGS84 业务事件转换为带稳定 ID 的 Web Mercator Point Feature。 */
export function createEventFeature(event: InspectionEvent): EventFeature {
  // 业务坐标统一以 WGS84 保存，进入地图时才转换为默认的 Web Mercator 投影。
  // Feature 的 geometry 参数决定空间位置；Point 接收 [x, y] 投影坐标，fromLonLat 接收 [经度, 纬度]。
  const feature = new Feature<Point>({
    geometry: new Point(fromLonLat([event.lng, event.lat])),
  })
  // setId 建立 Source 可索引的稳定业务主键；setProperties 批量写入供样式与交互读取的属性。
  feature.setId(event.id)
  feature.setProperties(getEventFeatureProperties(event))
  return feature
}

/** 就地同步业务字段和坐标，保留 Feature 身份及其空间索引关系。 */
export function updateEventFeature(feature: EventFeature, event: InspectionEvent): void {
  // setProperties 默认触发 change 事件，使依赖属性的样式函数重新求值。
  feature.setProperties(getEventFeatureProperties(event))
  // getGeometry 读取 Point；setCoordinates 原地更新坐标并通知 Source 刷新空间索引。
  feature.getGeometry()?.setCoordinates(fromLonLat([event.lng, event.lat]))
}

/** 创建禁止横向世界复制的事件 VectorSource，并可批量写入初始事件。 */
export function createEventSource(events: readonly InspectionEvent[] = []) {
  // features 是初始要素集合；wrapX=false 禁止要素跨世界副本重复显示。
  return new VectorSource<EventFeature>({
    features: events.map(createEventFeature),
    wrapX: false,
  })
}
