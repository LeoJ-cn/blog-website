import Feature from 'ol/Feature.js'
import LineString from 'ol/geom/LineString.js'
import Point from 'ol/geom/Point.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import { fromLonLat } from 'ol/proj.js'
import CircleStyle from 'ol/style/Circle.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'
import type { TrackPoint } from '../../types/track'

export interface ProjectedTrackPoint {
  /** Web Mercator 坐标，按 [x, y] 排列，单位为米。 */
  coordinate: [number, number]
  /** 对应采样时间，Unix 毫秒时间戳。 */
  timestamp: number
}

// 紫色只表达巡检轨迹，避开事件状态的红橙绿、Cluster 蓝色和选中态青色。
const lineStyle = new Style({ stroke: new Stroke({ color: '#8b5cf6', width: 4 }) })
const personStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    // 浅紫填充与深紫描边沿用轨迹语义，同时保留足够的底图对比度。
    fill: new Fill({ color: '#ede9fe' }),
    stroke: new Stroke({ color: '#7c3aed', width: 4 }),
  }),
  zIndex: 30,
})

export function createTrackLayer(points: readonly TrackPoint[]) {
  const projectedPoints: ProjectedTrackPoint[] = points.map((point) => ({
    coordinate: fromLonLat([point.lng, point.lat]) as [number, number],
    timestamp: point.timestamp,
  }))
  const coordinates = projectedPoints.map((point) => point.coordinate)
  const lineFeature = new Feature({ geometry: new LineString(coordinates), trackRole: 'line' })
  const personFeature = new Feature({
    geometry: new Point(coordinates[0] ?? [0, 0]),
    trackRole: 'person',
  })
  const source = new VectorSource({ features: [lineFeature, personFeature], wrapX: false })
  const layer = new VectorLayer({
    properties: { layerId: 'track' },
    source,
    style: (feature) => (feature.get('trackRole') === 'person' ? personStyle : lineStyle),
    zIndex: 25,
  })
  return { layer, source, personFeature, projectedPoints }
}
