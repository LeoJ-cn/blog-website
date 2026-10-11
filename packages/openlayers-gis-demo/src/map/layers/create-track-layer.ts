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
import Text from 'ol/style/Text.js'
import type { TrackPoint } from '../../types/track'

export interface ProjectedTrackPoint {
  /** Web Mercator 坐标，按 [x, y] 排列，单位为米。 */
  coordinate: [number, number]
  /** 对应采样时间，Unix 毫秒时间戳。 */
  timestamp: number
}

type CheckpointState = 'hidden' | 'pending' | 'current' | 'visited'

// 未巡与已巡统一使用紫色轨迹语义，通过虚实和线宽区分，避免仅依赖低对比透明度。
const remainingLineStyle = new Style({
  stroke: new Stroke({ color: '#c4b5fd', width: 4, lineDash: [10, 8] }),
})
const completedLineStyles = [
  // 深色外描边确保实线紫色在浅色道路和责任网格填充上仍保持清晰边界。
  new Style({ stroke: new Stroke({ color: '#2e1065', width: 9 }), zIndex: 10 }),
  new Style({ stroke: new Stroke({ color: '#8b5cf6', width: 6 }), zIndex: 11 }),
]
const personStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    // 浅紫填充与深紫描边沿用轨迹语义，同时保留足够的底图对比度。
    fill: new Fill({ color: '#ede9fe' }),
    stroke: new Stroke({ color: '#7c3aed', width: 4 }),
  }),
  zIndex: 30,
})
const checkpointStyleCache = new Map<string, Style>()

function getCheckpointStyle(state: CheckpointState, label: string): Style | undefined {
  if (state === 'hidden') return undefined
  const cacheKey = `${state}:${label}`
  const cachedStyle = checkpointStyleCache.get(cacheKey)
  if (cachedStyle) return cachedStyle
  const color = state === 'current' ? '#fbbf24' : state === 'visited' ? '#8b5cf6' : '#c4b5fd'
  const style = new Style({
    image: new CircleStyle({
      radius: state === 'current' ? 6 : 5,
      fill: new Fill({ color: state === 'pending' ? '#1e1b4b' : color }),
      stroke: new Stroke({ color: '#f8fafc', width: state === 'current' ? 2.5 : 1.5 }),
    }),
    text: new Text({
      text: label,
      offsetY: -15,
      font: '600 10px sans-serif',
      fill: new Fill({ color }),
      backgroundFill: new Fill({ color: '#08101fe6' }),
      padding: [2, 4, 2, 4],
    }),
    zIndex: state === 'current' ? 24 : 20,
  })
  checkpointStyleCache.set(cacheKey, style)
  return style
}

export function createTrackLayer(points: readonly TrackPoint[]) {
  const projectedPoints: ProjectedTrackPoint[] = points.map((point) => ({
    coordinate: fromLonLat([point.lng, point.lat]) as [number, number],
    timestamp: point.timestamp,
  }))
  const coordinates = projectedPoints.map((point) => point.coordinate)
  const lineFeature = new Feature({
    geometry: new LineString(coordinates),
    trackRole: 'remainingLine',
  })
  const completedLineFeature = new Feature({
    geometry: new LineString(coordinates.slice(0, 1)),
    trackRole: 'completedLine',
  })
  const personFeature = new Feature({
    geometry: new Point(coordinates[0] ?? [0, 0]),
    trackRole: 'person',
  })
  const checkpointFeatures = coordinates.map(
    (coordinate, sequence) =>
      new Feature({
        geometry: new Point(coordinate),
        trackRole: 'checkpoint',
        // sequence 为零基巡检顺序；标签使用一基序号，并明确首尾节点。
        checkpointSequence: sequence,
        checkpointLabel:
          sequence === 0
            ? '1 起'
            : sequence === coordinates.length - 1
              ? `${sequence + 1} 终`
              : String(sequence + 1),
        checkpointState: 'hidden' satisfies CheckpointState,
      }),
  )
  const source = new VectorSource({
    features: [lineFeature, completedLineFeature, ...checkpointFeatures, personFeature],
    wrapX: false,
  })
  const layer = new VectorLayer({
    properties: { layerId: 'track' },
    source,
    style: (feature) => {
      const role = feature.get('trackRole')
      if (role === 'person') return personStyle
      if (role === 'completedLine') return completedLineStyles
      if (role === 'checkpoint') {
        return getCheckpointStyle(
          String(feature.get('checkpointState')) as CheckpointState,
          String(feature.get('checkpointLabel')),
        )
      }
      return remainingLineStyle
    },
    zIndex: 25,
  })
  return {
    layer,
    source,
    personFeature,
    completedLineFeature,
    projectedPoints,
    /** activeSequence 为当前节点的零基序号；null 会隐藏节点，避免实时态势地图信息过载。 */
    setCheckpointProgress(activeSequence: number | null) {
      const normalizedSequence =
        activeSequence === null
          ? null
          : Math.min(checkpointFeatures.length - 1, Math.max(0, Math.floor(activeSequence)))
      for (const feature of checkpointFeatures) {
        const sequence = Number(feature.get('checkpointSequence'))
        const nextState: CheckpointState =
          normalizedSequence === null
            ? 'hidden'
            : sequence < normalizedSequence
              ? 'visited'
              : sequence === normalizedSequence
                ? 'current'
                : 'pending'
        feature.set('checkpointState', nextState, true)
      }
      layer.changed()
    },
  }
}
