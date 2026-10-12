import Feature from 'ol/Feature.js' // OpenLayers 要素容器，承载轨迹线、检查点和当前位置。
import LineString from 'ol/geom/LineString.js' // OpenLayers 线几何，按顺序连接轨迹投影坐标。
import Point from 'ol/geom/Point.js' // OpenLayers 点几何，表示检查点与当前位置。
import VectorLayer from 'ol/layer/Vector.js' // OpenLayers 矢量图层，统一绘制轨迹相关要素。
import VectorSource from 'ol/source/Vector.js' // OpenLayers 矢量数据源，保存并索引全部轨迹要素。
import { fromLonLat } from 'ol/proj.js' // 将轨迹 WGS84 经纬度转换为地图投影坐标。
import CircleStyle from 'ol/style/Circle.js' // OpenLayers 圆形点符号，用于绘制轨迹节点。
import Fill from 'ol/style/Fill.js' // OpenLayers 填充样式，控制轨迹节点内部颜色。
import Stroke from 'ol/style/Stroke.js' // OpenLayers 描边样式，控制轨迹线和节点边界。
import Style from 'ol/style/Style.js' // OpenLayers 要素样式容器，组合不同轨迹要素的样式。
import Text from 'ol/style/Text.js' // OpenLayers 文本样式，用于绘制检查点标签。
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
  // Stroke.color 为 CSS 颜色，width 为像素，lineDash 按 [实线长度, 间隔长度] 排列。
  stroke: new Stroke({ color: '#c4b5fd', width: 4, lineDash: [10, 8] }),
})
const completedLineStyles = [
  // 深色外描边确保实线紫色在浅色道路和责任网格填充上仍保持清晰边界。
  new Style({ stroke: new Stroke({ color: '#2e1065', width: 9 }), zIndex: 10 }),
  new Style({ stroke: new Stroke({ color: '#8b5cf6', width: 6 }), zIndex: 11 }),
]
const personStyle = new Style({
  // CircleStyle.radius 单位为像素；fill/stroke 分别控制内部与边界。
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
    // image 绘制检查点圆标；半径和描边宽度均使用屏幕像素。
    image: new CircleStyle({
      radius: state === 'current' ? 6 : 5,
      fill: new Fill({ color: state === 'pending' ? '#1e1b4b' : color }),
      stroke: new Stroke({ color: '#f8fafc', width: state === 'current' ? 2.5 : 1.5 }),
    }),
    // Text.text 是标签；offsetY 为垂直像素偏移，负值向上；padding 顺序为上右下左。
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
  // fromLonLat 接收 [经度, 纬度]，返回默认 EPSG:3857 的 [x, y] 米制投影坐标。
  const projectedPoints: ProjectedTrackPoint[] = points.map((point) => ({
    coordinate: fromLonLat([point.lng, point.lat]) as [number, number],
    timestamp: point.timestamp,
  }))
  const coordinates = projectedPoints.map((point) => point.coordinate)
  // LineString(coordinates) 按数组顺序连接坐标；Feature 同时保存几何和 trackRole 属性。
  const lineFeature = new Feature({
    geometry: new LineString(coordinates),
    trackRole: 'remainingLine',
  })
  // 已巡线初始只含首点，后续通过 LineString.setCoordinates 逐帧增长。
  const completedLineFeature = new Feature({
    geometry: new LineString(coordinates.slice(0, 1)),
    trackRole: 'completedLine',
  })
  // Point 接收单个 [x, y]；无轨迹时使用 [0, 0] 占位，图层由上层状态控制是否展示。
  const personFeature = new Feature({
    geometry: new Point(coordinates[0] ?? [0, 0]),
    trackRole: 'person',
  })
  const checkpointFeatures = coordinates.map(
    (coordinate, sequence) =>
      // 每个检查点是独立 Point Feature，属性供 VectorLayer 的 style 回调读取。
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
  // features 是初始轨迹要素集合；wrapX=false 防止轨迹跨世界副本重复出现。
  const source = new VectorSource({
    features: [lineFeature, completedLineFeature, ...checkpointFeatures, personFeature],
    wrapX: false,
  })
  // VectorLayer 复用一个 Source，并根据每个 Feature 的 trackRole 选择样式。
  const layer = new VectorLayer({
    properties: { layerId: 'track' },
    source,
    // style(feature) 在绘制时调用；get(key) 读取自定义角色、状态和标签属性。
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
        // get 读取零基序号；set(..., true) 静默批量更新，最后统一 changed() 重绘。
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
      // changed() 通知 OpenLayers 重新执行 style 回调，显示新的检查点状态。
      layer.changed()
    },
  }
}
