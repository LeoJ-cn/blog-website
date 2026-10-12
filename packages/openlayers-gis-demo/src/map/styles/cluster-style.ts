import CircleStyle from 'ol/style/Circle.js' // OpenLayers 圆形点符号，用于绘制聚合气泡。
import Fill from 'ol/style/Fill.js' // OpenLayers 填充样式，控制聚合气泡和文字背景色。
import Stroke from 'ol/style/Stroke.js' // OpenLayers 描边样式，控制聚合气泡边界。
import Style from 'ol/style/Style.js' // OpenLayers 要素样式容器，组合聚合图形与数量文本。
import Text from 'ol/style/Text.js' // OpenLayers 文本样式，用于显示聚合包含的事件数量。

const CACHE = new Map<number, Style>()
const MAX_CACHE_SIZE = 2048

export function getClusterStyle(size: number): Style {
  // Style 函数会随地图重绘高频执行，按聚合数量复用实例以降低 GC 压力。
  const cached = CACHE.get(size)
  if (cached) return cached
  const style = new Style({
    // image 配置聚合点符号；radius 单位为像素，并限制最大值避免大聚合遮挡地图。
    image: new CircleStyle({
      radius: Math.min(24, 12 + Math.log10(Math.max(size, 1)) * 4),
      fill: new Fill({ color: size > 100 ? '#0f4c81e8' : '#0369a1e8' }),
      stroke: new Stroke({ color: '#7dd3fc', width: 2 }),
    }),
    // Text.text 是标签内容；fill 控制字色；font 使用 CSS font 简写语法。
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
