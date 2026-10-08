import CircleStyle from 'ol/style/Circle.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import Style from 'ol/style/Style.js'
import type { EventLevel } from '../../types/inspection-event'

const LEVEL_COLORS: Record<EventLevel, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
}

// Style 函数会在渲染循环中高频调用，按等级复用实例以避免产生短生命周期对象。
const EVENT_STYLE_CACHE = new Map<EventLevel, Style>()

export const selectedEventStyle = new Style({
  image: new CircleStyle({
    radius: 10,
    fill: new Fill({ color: '#38bdf8' }),
    stroke: new Stroke({ color: '#ffffff', width: 3 }),
  }),
  zIndex: 100,
})

export function getEventStyle(level: EventLevel): Style {
  const cachedStyle = EVENT_STYLE_CACHE.get(level)
  if (cachedStyle) return cachedStyle

  const style = new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: LEVEL_COLORS[level] }),
      stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
    }),
  })
  EVENT_STYLE_CACHE.set(level, style)
  return style
}
