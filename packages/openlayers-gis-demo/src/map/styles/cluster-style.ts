import CircleStyle from 'ol/style/Circle.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'
import Text from 'ol/style/Text.js'

const CACHE = new Map<number, Style>()
const MAX_CACHE_SIZE = 2048

export function getClusterStyle(size: number): Style {
  // Style 函数会随地图重绘高频执行，按聚合数量复用实例以降低 GC 压力。
  const cached = CACHE.get(size)
  if (cached) return cached
  const style = new Style({
    image: new CircleStyle({
      radius: Math.min(24, 12 + Math.log10(Math.max(size, 1)) * 4),
      fill: new Fill({ color: size > 100 ? '#0f4c81e8' : '#0369a1e8' }),
      stroke: new Stroke({ color: '#7dd3fc', width: 2 }),
    }),
    text: new Text({
      text: String(size),
      fill: new Fill({ color: '#fff' }),
      font: '600 12px system-ui',
    }),
  })
  // 聚合数量会随缩放和数据集不断变化，限制缓存容量以避免长时间操作后无限增长。
  if (CACHE.size >= MAX_CACHE_SIZE) CACHE.clear()
  CACHE.set(size, style)
  return style
}
